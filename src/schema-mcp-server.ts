import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { generateSQL } from "./lib/sql-generator";
import type { DatabaseSchema } from "./types/schema";

// Create MCP server
const server = new Server(
  {
    name: "schema-generator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register schema generation tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_schema",
        description:
          "Generates a database schema from a natural language description. Returns structured schema JSON that can be visualized.",
        inputSchema: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Natural language description of the database schema to generate",
            },
          },
          required: ["description"],
        },
      },
      {
        name: "supabase_list_projects",
        description:
          "Lists Supabase projects available to the configured Supabase access token. Useful for mapping a user-provided project name to its project ref.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: "supabase_apply_schema",
        description:
          "Generates PostgreSQL DDL from a schema object and (optionally) executes it against a Supabase project's database. Safety: requires confirm=true to execute and will refuse to run if any target table already exists.",
        inputSchema: {
          type: "object",
          properties: {
            project_ref: {
              type: "string",
              description: "Supabase project ref (the short ID used in the dashboard URL)",
            },
            schema_name: {
              type: "string",
              description: "Postgres schema to create tables in (usually 'public')",
              default: "public",
            },
            schema: {
              type: "object",
              description:
                "Database schema object containing tables and relations (same structure used by schemaCanvas)",
            },
            confirm: {
              type: "boolean",
              description:
                "Must be true to execute. If false, the tool will only return a preview and any conflicts.",
            },
          },
          required: ["project_ref", "schema", "confirm"],
          additionalProperties: false,
        },
      },
    ],
  };
});

// Handle schema generation
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "generate_schema") {
    const description = String(request.params.arguments?.description || "");

    // Parse the description and generate schema
    const schema = generateSchemaFromDescription(description);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "supabase_list_projects") {
    const projects = await supabaseListProjects();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(projects, null, 2),
        },
      ],
    };
  }

  if (request.params.name === "supabase_apply_schema") {
    const projectRef = String(request.params.arguments?.project_ref || "").trim();
    const schemaName = String(
      request.params.arguments?.schema_name || "public"
    ).trim();
    const confirm = Boolean(request.params.arguments?.confirm);
    const schema = request.params.arguments?.schema as unknown;

    if (!projectRef) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: false,
                executed: false,
                error: "Missing required argument: project_ref",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    let executableSql: string | undefined;

    try {
      assertValidIdentifier(schemaName, "schema_name");
      const parsedSchema = parseSchema(schema);
      assertSchemaIsSafeToExecute(parsedSchema);

      const tableNames = parsedSchema.tables.map((t) => t.name);
      const existingTables = await supabaseFindExistingTables({
        projectRef,
        schemaName,
        tableNames,
      });

      // Even though we generate idempotent DDL (IF NOT EXISTS), we still block execution
      // when any target table already exists to avoid modifying existing schemas.

      const ddl = generateSQL(parsedSchema, {
        includeHeader: false,
        includeComments: false,
        qualifyTables: true,
        schemaName,
        idempotent: true,
        strictExpressionSafety: true,
      });

      executableSql = `BEGIN;\n${stripSqlComments(ddl)}\nCOMMIT;`;

      if (existingTables.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: false,
                  executed: false,
                  error:
                    "One or more tables already exist in the target database.",
                  conflicts: existingTables,
                  project_ref: projectRef,
                  schema_name: schemaName,
                  sql_preview: executableSql,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (!confirm) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: true,
                  executed: false,
                  project_ref: projectRef,
                  schema_name: schemaName,
                  tables_to_create: tableNames,
                  sql_preview: executableSql,
                  next_step:
                    "Ask the user to confirm, then call supabase_apply_schema again with confirm=true.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      try {
        const result = await supabaseDatabaseQuery({
          projectRef,
          readOnly: false,
          query: executableSql,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: true,
                  executed: true,
                  project_ref: projectRef,
                  schema_name: schemaName,
                  tables_created: tableNames,
                  result,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: false,
                  executed: false,
                  project_ref: projectRef,
                  schema_name: schemaName,
                  error: message,
                  stage: "execution",
                  sql_preview: executableSql,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: false,
                executed: false,
                project_ref: projectRef,
                schema_name: schemaName,
                error: message,
                stage: "validation_or_generation",
                sql_preview: executableSql,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

type SupabaseProjectListItem = {
  name: string;
  id: string;
  region: string;
  status: string;
  databaseHost: string;
  createdAt: string;
};

async function supabaseListProjects(): Promise<SupabaseProjectListItem[]> {
  const projects = (await supabaseRequest("/v1/projects")) as unknown[];

  return projects
    .map((project) => {
      const p = project as Record<string, unknown>;
      const ref = typeof p.ref === "string" ? p.ref : undefined;
      const name = typeof p.name === "string" ? p.name : undefined;
      const region = typeof p.region === "string" ? p.region : "";
      const status = typeof p.status === "string" ? p.status : "";
      const createdAt = typeof p.created_at === "string" ? p.created_at : "";

      if (!ref || !name) return null;

      return {
        name,
        id: ref,
        region,
        status,
        databaseHost: `db.${ref}.supabase.co`,
        createdAt,
      };
    })
    .filter((p): p is SupabaseProjectListItem => Boolean(p));
}

async function supabaseFindExistingTables(args: {
  projectRef: string;
  schemaName: string;
  tableNames: string[];
}): Promise<string[]> {
  if (args.tableNames.length === 0) return [];

  for (const name of args.tableNames) {
    assertValidIdentifier(name, "table name");
  }

  const inList = args.tableNames
    .map((t) => `'${escapeSqlStringLiteral(t)}'`)
    .join(", ");

  const query = [
    "SELECT table_name",
    "FROM information_schema.tables",
    `WHERE table_schema = '${escapeSqlStringLiteral(args.schemaName)}'`,
    `AND table_name IN (${inList});`,
  ].join("\n");

  const response = await supabaseDatabaseQuery({
    projectRef: args.projectRef,
    readOnly: true,
    query,
  });

  const rows = getSupabaseQueryRows(response);
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      return typeof r.table_name === "string" ? r.table_name : null;
    })
    .filter((v): v is string => Boolean(v));
}

function getSupabaseQueryRows(response: unknown): unknown[] | null {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return null;

  const r = response as Record<string, unknown>;
  const data = r.data;
  if (Array.isArray(data)) return data;

  const result = r.result;
  if (Array.isArray(result)) return result;

  return null;
}

async function supabaseDatabaseQuery(args: {
  projectRef: string;
  readOnly: boolean;
  query: string;
}): Promise<unknown> {
  const endpoint = args.readOnly
    ? `/v1/projects/${args.projectRef}/database/query/read-only`
    : `/v1/projects/${args.projectRef}/database/query`;

  return supabaseRequest(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: args.query }),
  });
}

async function supabaseRequest(
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  if (typeof fetch !== "function") {
    throw new Error(
      "Global fetch is not available in this runtime. Use Node.js 18+ or provide a fetch polyfill."
    );
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("SUPABASE_ACCESS_TOKEN is not set in the server environment");
  }

  const timeoutMs = 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`https://api.supabase.com${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Supabase API request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Supabase API request failed (${res.status} ${res.statusText}): ${body || "(empty response)"}`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return res.text();
  }

  return res.json();
}

function parseSchema(schema: unknown): DatabaseSchema {
  if (!schema || typeof schema !== "object") {
    throw new Error("schema must be an object");
  }

  const s = schema as Partial<DatabaseSchema>;
  if (!s.name || typeof s.name !== "string") {
    throw new Error("schema.name must be a string");
  }
  if (!Array.isArray(s.tables)) {
    throw new Error("schema.tables must be an array");
  }
  if (!Array.isArray(s.relations)) {
    throw new Error("schema.relations must be an array");
  }

  for (const table of s.tables as unknown[]) {
    if (!table || typeof table !== "object") {
      throw new Error("schema.tables entries must be objects");
    }
    const t = table as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.name !== "string") {
      throw new Error("schema.tables entries must include string id and name");
    }
    if (!Array.isArray(t.columns)) {
      throw new Error("schema.tables entries must include a columns array");
    }
  }

  for (const relation of s.relations as unknown[]) {
    if (!relation || typeof relation !== "object") {
      throw new Error("schema.relations entries must be objects");
    }
    const r = relation as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.type !== "string") {
      throw new Error("schema.relations entries must include string id and type");
    }
    const from = r.from;
    const to = r.to;
    if (!from || typeof from !== "object" || !to || typeof to !== "object") {
      throw new Error("schema.relations entries must include from/to objects");
    }
  }

  return s as DatabaseSchema;
}

function assertSchemaIsSafeToExecute(schema: DatabaseSchema): void {
  const tableNameSet = new Set<string>();

  for (const table of schema.tables) {
    assertValidIdentifier(table.name, "table name");
    if (tableNameSet.has(table.name)) {
      throw new Error(`Duplicate table name: ${table.name}`);
    }
    tableNameSet.add(table.name);

    const columnNameSet = new Set<string>();
    for (const column of table.columns) {
      assertValidIdentifier(column.name, "column name");
      if (columnNameSet.has(column.name)) {
        throw new Error(
          `Duplicate column name '${column.name}' in table '${table.name}'`
        );
      }
      columnNameSet.add(column.name);

      if (column.defaultValue) {
        assertSafeSqlFragment(column.defaultValue, "defaultValue");
      }
      if (column.check) {
        assertSafeSqlFragment(column.check, "check");
      }
    }
  }
}

function assertValidIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${label} must be a valid SQL identifier: '${value}'`);
  }
}

function assertSafeSqlFragment(value: string, label: string): void {
  if (/[;]|--|\/\*/.test(value)) {
    throw new Error(
      `${label} contains disallowed characters (semicolons or SQL comments): '${value}'`
    );
  }
}

function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .trim();
}

function escapeSqlStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function generateSchemaFromDescription(description: string): DatabaseSchema {
  const lowerDesc = description.toLowerCase();

  // Simple keyword-based schema generation
  const tables: DatabaseSchema["tables"] = [];
  let colId = 0;

  // Common patterns
  if (lowerDesc.includes("user") || lowerDesc.includes("account")) {
    tables.push({
      id: "users",
      name: "users",
      position: { x: 100, y: 100 },
      color: "#FFD700",
      columns: [
        { id: `col_${colId++}`, name: "id", type: "uuid", primaryKey: true, notNull: true, defaultValue: "gen_random_uuid()" },
        { id: `col_${colId++}`, name: "email", type: "text", unique: true, notNull: true },
        { id: `col_${colId++}`, name: "name", type: "text", notNull: true },
        { id: `col_${colId++}`, name: "created_at", type: "timestamptz", notNull: true, defaultValue: "now()" },
      ],
    });
  }

  if (lowerDesc.includes("post") || lowerDesc.includes("article") || lowerDesc.includes("blog")) {
    tables.push({
      id: "posts",
      name: "posts",
      position: { x: 400, y: 100 },
      color: "#FF69B4",
      columns: [
        { id: `col_${colId++}`, name: "id", type: "uuid", primaryKey: true, notNull: true, defaultValue: "gen_random_uuid()" },
        { id: `col_${colId++}`, name: "title", type: "text", notNull: true },
        { id: `col_${colId++}`, name: "content", type: "text" },
        { id: `col_${colId++}`, name: "user_id", type: "uuid", notNull: true },
        { id: `col_${colId++}`, name: "created_at", type: "timestamptz", notNull: true, defaultValue: "now()" },
      ],
    });
  }

  if (lowerDesc.includes("comment")) {
    tables.push({
      id: "comments",
      name: "comments",
      position: { x: 700, y: 100 },
      color: "#00FFFF",
      columns: [
        { id: `col_${colId++}`, name: "id", type: "uuid", primaryKey: true, notNull: true, defaultValue: "gen_random_uuid()" },
        { id: `col_${colId++}`, name: "content", type: "text", notNull: true },
        { id: `col_${colId++}`, name: "post_id", type: "uuid", notNull: true },
        { id: `col_${colId++}`, name: "user_id", type: "uuid", notNull: true },
        { id: `col_${colId++}`, name: "created_at", type: "timestamptz", notNull: true, defaultValue: "now()" },
      ],
    });
  }

  if (lowerDesc.includes("product")) {
    tables.push({
      id: "products",
      name: "products",
      position: { x: 100, y: 100 },
      color: "#7FFF00",
      columns: [
        { id: `col_${colId++}`, name: "id", type: "uuid", primaryKey: true, notNull: true, defaultValue: "gen_random_uuid()" },
        { id: `col_${colId++}`, name: "name", type: "text", notNull: true },
        { id: `col_${colId++}`, name: "description", type: "text" },
        { id: `col_${colId++}`, name: "price", type: "decimal", notNull: true },
        { id: `col_${colId++}`, name: "stock", type: "integer", notNull: true, defaultValue: "0" },
      ],
    });
  }

  if (lowerDesc.includes("order")) {
    tables.push({
      id: "orders",
      name: "orders",
      position: { x: 400, y: 100 },
      color: "#FF6347",
      columns: [
        { id: `col_${colId++}`, name: "id", type: "uuid", primaryKey: true, notNull: true, defaultValue: "gen_random_uuid()" },
        { id: `col_${colId++}`, name: "user_id", type: "uuid", notNull: true },
        { id: `col_${colId++}`, name: "total", type: "decimal", notNull: true },
        { id: `col_${colId++}`, name: "status", type: "text", notNull: true },
        { id: `col_${colId++}`, name: "created_at", type: "timestamptz", notNull: true, defaultValue: "now()" },
      ],
    });
  }

  if (lowerDesc.includes("customer") && !tables.find((t) => t.id === "users")) {
    tables.push({
      id: "customers",
      name: "customers",
      position: { x: 100, y: 100 },
      color: "#9370DB",
      columns: [
        { id: `col_${colId++}`, name: "id", type: "uuid", primaryKey: true, notNull: true, defaultValue: "gen_random_uuid()" },
        { id: `col_${colId++}`, name: "name", type: "text", notNull: true },
        { id: `col_${colId++}`, name: "email", type: "text", unique: true, notNull: true },
        { id: `col_${colId++}`, name: "phone", type: "text" },
      ],
    });
  }

  // Generate relations
  const relations: DatabaseSchema["relations"] = [];
  let relId = 0;

  // Auto-detect foreign keys and create relations
  tables.forEach((table) => {
    table.columns.forEach((col) => {
      if (col.name.endsWith("_id")) {
        const refTableName = col.name.replace("_id", "") + "s";
        const refTable = tables.find((t) => t.name === refTableName);
        if (refTable) {
          relations.push({
            id: `rel_${relId++}`,
            name: `fk_${table.name}_${refTable.name}`,
            from: { tableId: table.id, columnId: col.id },
            to: { tableId: refTable.id, columnId: refTable.columns[0].id },
            type: "many-to-one",
            onDelete: "CASCADE",
          });
        }
      }
    });
  });

  return {
    name: "Generated Schema",
    description: description,
    tables,
    relations,
  };
}

// Start server
const transport = new StdioServerTransport();
server.connect(transport);

console.error("Schema Generator MCP Server running on stdio");
