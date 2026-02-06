import { config } from "dotenv";
import { resolve } from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { generateSQL } from "./lib/sql-generator";
import type { DatabaseSchema } from "./types/schema";

// Load environment variables from .env.local file (or .env as fallback)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

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
          "Generates a database schema from a natural language description. Returns a structured schema JSON object that can be visualized with schemaCanvas component. IMPORTANT: Save the returned schema object - you will need to pass it to supabase_apply_schema later if the user wants to create these tables in their Supabase project.",
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
        name: "supabase_fetch_schema",
        description:
          "Fetches existing tables and their structure from a Supabase project database and returns them as a visualizable schema object. Use this to load and visualize existing database schemas. The returned schema object can be rendered using schemaCanvas component or modified and passed to supabase_apply_schema to create tables in another project.",
        inputSchema: {
          type: "object",
          properties: {
            project_ref: {
              type: "string",
              description: "Supabase project ref (the short ID used in the dashboard URL)",
            },
            schema_name: {
              type: "string",
              description: "Postgres schema to read tables from (usually 'public')",
              default: "public",
            },
          },
          required: ["project_ref"],
          additionalProperties: false,
        },
      },
      {
        name: "supabase_execute_sql",
        description:
          "Executes raw SQL statements on a Supabase project database. Use this to apply SQL generated from the schema designer UI (the SQL shown when user clicks 'View SQL'). Safety: requires confirm=true to execute. The SQL will be wrapped in a transaction (BEGIN/COMMIT) automatically.",
        inputSchema: {
          type: "object",
          properties: {
            project_ref: {
              type: "string",
              description: "Supabase project ref (the short ID used in the dashboard URL)",
            },
            sql: {
              type: "string",
              description: "The SQL statements to execute. Can include multiple CREATE TABLE statements. Do NOT include BEGIN/COMMIT as they will be added automatically.",
            },
            confirm: {
              type: "boolean",
              description:
                "Must be true to execute. If false, the tool will only return a preview of what will be executed.",
            },
          },
          required: ["project_ref", "sql", "confirm"],
          additionalProperties: false,
        },
      },
      {
        name: "supabase_apply_schema",
        description:
          "Applies a schema to Supabase by generating and executing PostgreSQL DDL. IMPORTANT: You must pass the complete schema object (not an empty object) that was previously generated using generate_schema or fetched using supabase_fetch_schema. The schema parameter must include the full 'tables' array with all table definitions and columns. Safety: requires confirm=true to execute and will refuse to run if any target table already exists.",
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
                "REQUIRED: The complete database schema object with 'tables' array and 'relations' array. This is the SAME schema object returned by generate_schema. You must pass the ENTIRE schema object here, not an empty object or partial data. Example: {name: 'My Schema', tables: [{id: 'users', name: 'users', columns: [...]}, ...], relations: [...]}",
              properties: {
                name: {
                  type: "string",
                  description: "Schema name"
                },
                tables: {
                  type: "array",
                  description: "Array of table definitions (REQUIRED - cannot be empty)"
                },
                relations: {
                  type: "array",
                  description: "Array of foreign key relations between tables"
                }
              },
              required: ["tables"]
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

  if (request.params.name === "supabase_fetch_schema") {
    const projectRef = String(request.params.arguments?.project_ref || "").trim();
    const schemaName = String(
      request.params.arguments?.schema_name || "public"
    ).trim();

    if (!projectRef) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: false,
                error: "Missing required argument: project_ref",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    try {
      const schema = await supabaseFetchSchema({
        projectRef,
        schemaName,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(schema, null, 2),
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
                error: message,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  if (request.params.name === "supabase_execute_sql") {
    const projectRef = String(request.params.arguments?.project_ref || "").trim();
    const sql = String(request.params.arguments?.sql || "").trim();
    const confirm = Boolean(request.params.arguments?.confirm);

    console.error("=== supabase_execute_sql called ===");
    console.error("Project ref:", projectRef);
    console.error("Confirm:", confirm);
    console.error("SQL length:", sql.length, "characters");

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

    if (!sql) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: false,
                executed: false,
                error: "Missing required argument: sql",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Prepare SQL with transaction wrapper
    const executableSql = `BEGIN;\n${stripSqlComments(sql)}\nCOMMIT;`;

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
                sql_preview: executableSql,
                next_step:
                  "Ask the user to confirm, then call supabase_execute_sql again with confirm=true.",
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
                message: "SQL executed successfully",
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
                error: message,
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

  if (request.params.name === "supabase_apply_schema") {
    const projectRef = String(request.params.arguments?.project_ref || "").trim();
    const schemaName = String(
      request.params.arguments?.schema_name || "public"
    ).trim();
    const confirm = Boolean(request.params.arguments?.confirm);
    const schema = request.params.arguments?.schema as unknown;

    console.error("=== supabase_apply_schema called ===");
    console.error("Project ref:", projectRef);
    console.error("Schema name:", schemaName);
    console.error("Confirm:", confirm);
    console.error("Raw schema received:", JSON.stringify(schema, null, 2));

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
      console.error("Validating schema name...");
      assertValidIdentifier(schemaName, "schema_name");

      console.error("Parsing schema...");
      const parsedSchema = parseSchema(schema);
      console.error("Parsed schema:", JSON.stringify(parsedSchema, null, 2));

      console.error("Asserting schema is safe...");
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

async function supabaseFetchSchema(args: {
  projectRef: string;
  schemaName: string;
}): Promise<DatabaseSchema> {
  // Fetch all tables
  const tablesQuery = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '${escapeSqlStringLiteral(args.schemaName)}'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const tablesResponse = await supabaseDatabaseQuery({
    projectRef: args.projectRef,
    readOnly: true,
    query: tablesQuery,
  });

  const tableRows = getSupabaseQueryRows(tablesResponse);
  if (!Array.isArray(tableRows)) {
    throw new Error("Failed to fetch tables from database");
  }

  const tables: DatabaseSchema["tables"] = [];
  let colIdCounter = 0;

  // For each table, fetch columns
  for (const tableRow of tableRows) {
    if (!tableRow || typeof tableRow !== "object") continue;
    const r = tableRow as Record<string, unknown>;
    const tableName = typeof r.table_name === "string" ? r.table_name : null;
    if (!tableName) continue;

    // Fetch columns for this table
    const columnsQuery = `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        tc.constraint_type
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu
        ON c.table_schema = kcu.table_schema
        AND c.table_name = kcu.table_name
        AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      WHERE c.table_schema = '${escapeSqlStringLiteral(args.schemaName)}'
        AND c.table_name = '${escapeSqlStringLiteral(tableName)}'
      ORDER BY c.ordinal_position;
    `;

    const columnsResponse = await supabaseDatabaseQuery({
      projectRef: args.projectRef,
      readOnly: true,
      query: columnsQuery,
    });

    const columnRows = getSupabaseQueryRows(columnsResponse);
    if (!Array.isArray(columnRows)) continue;

    const columns: DatabaseSchema["tables"][0]["columns"] = [];

    for (const columnRow of columnRows) {
      if (!columnRow || typeof columnRow !== "object") continue;
      const col = columnRow as Record<string, unknown>;

      const columnName = typeof col.column_name === "string" ? col.column_name : "";
      const dataType = typeof col.data_type === "string" ? col.data_type : "text";
      const isNullable = col.is_nullable === "NO" ? false : true;
      const columnDefault = typeof col.column_default === "string" ? col.column_default : undefined;
      const constraintType = typeof col.constraint_type === "string" ? col.constraint_type : null;

      // Map PostgreSQL types to our schema types
      let mappedType = dataType;
      if (dataType.includes("character varying")) mappedType = "varchar";
      else if (dataType.includes("character")) mappedType = "text";
      else if (dataType.includes("timestamp")) mappedType = "timestamptz";
      else if (dataType.includes("integer")) mappedType = "integer";
      else if (dataType.includes("bigint")) mappedType = "bigint";
      else if (dataType.includes("boolean")) mappedType = "boolean";
      else if (dataType.includes("uuid")) mappedType = "uuid";
      else if (dataType.includes("json")) mappedType = "jsonb";

      columns.push({
        id: `col_${colIdCounter++}`,
        name: columnName,
        type: mappedType as DatabaseSchema["tables"][0]["columns"][0]["type"],
        notNull: !isNullable,
        primaryKey: constraintType === "PRIMARY KEY",
        unique: constraintType === "UNIQUE",
        defaultValue: columnDefault,
      });
    }

    tables.push({
      id: tableName,
      name: tableName,
      position: {
        x: 100 + (tables.length * 350),
        y: 100 + (Math.floor(tables.length / 3) * 300)
      },
      columns,
    });
  }

  // Fetch foreign key relationships
  const relationsQuery = `
    SELECT
      tc.constraint_name,
      kcu.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = '${escapeSqlStringLiteral(args.schemaName)}';
  `;

  const relationsResponse = await supabaseDatabaseQuery({
    projectRef: args.projectRef,
    readOnly: true,
    query: relationsQuery,
  });

  const relationRows = getSupabaseQueryRows(relationsResponse);
  const relations: DatabaseSchema["relations"] = [];
  let relIdCounter = 0;

  if (Array.isArray(relationRows)) {
    for (const relRow of relationRows) {
      if (!relRow || typeof relRow !== "object") continue;
      const rel = relRow as Record<string, unknown>;

      const fromTable = typeof rel.from_table === "string" ? rel.from_table : null;
      const fromColumn = typeof rel.from_column === "string" ? rel.from_column : null;
      const toTable = typeof rel.to_table === "string" ? rel.to_table : null;
      const toColumn = typeof rel.to_column === "string" ? rel.to_column : null;
      const constraintName = typeof rel.constraint_name === "string" ? rel.constraint_name : "";

      if (!fromTable || !toTable || !fromColumn || !toColumn) continue;

      // Find the column IDs
      const fromTableObj = tables.find(t => t.name === fromTable);
      const toTableObj = tables.find(t => t.name === toTable);

      if (!fromTableObj || !toTableObj) continue;

      const fromColumnObj = fromTableObj.columns.find(c => c.name === fromColumn);
      const toColumnObj = toTableObj.columns.find(c => c.name === toColumn);

      if (!fromColumnObj || !toColumnObj) continue;

      relations.push({
        id: `rel_${relIdCounter++}`,
        name: constraintName,
        from: { tableId: fromTableObj.id, columnId: fromColumnObj.id },
        to: { tableId: toTableObj.id, columnId: toColumnObj.id },
        type: "many-to-one",
        onDelete: "CASCADE",
      });
    }
  }

  return {
    name: `${args.schemaName} Schema`,
    description: `Fetched from Supabase project ${args.projectRef}`,
    tables,
    relations,
  };
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

  // Support both SUPABASE_ACCESS_TOKEN and NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN is not set. Please set it in your .env.local or .env file."
    );
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
  console.error("--- parseSchema called ---");
  console.error("Input schema type:", typeof schema);
  console.error("Input schema:", JSON.stringify(schema, null, 2));

  if (!schema || typeof schema !== "object") {
    const error = "schema must be an object. You passed an invalid schema parameter.";
    console.error("ERROR:", error);
    throw new Error(error);
  }

  const s = schema as Partial<DatabaseSchema>;

  // Check if schema is empty
  if (Object.keys(s).length === 0) {
    const error = "schema parameter is an empty object {}. You must pass the complete schema object with tables array that was generated by generate_schema tool. Do not pass an empty object.";
    console.error("ERROR:", error);
    throw new Error(error);
  }

  // Provide a default name if missing
  const name = s.name && typeof s.name === "string" ? s.name : "Generated Schema";
  console.error("Schema name:", name);

  if (!Array.isArray(s.tables)) {
    const error = `schema.tables must be an array. Got: ${typeof s.tables}. The schema parameter must include a 'tables' array with table definitions. Make sure you are passing the complete schema object returned by generate_schema, not an empty object.`;
    console.error("ERROR:", error);
    throw new Error(error);
  }
  console.error("Number of tables:", s.tables.length);

  if (!s.relations) {
    console.error("Relations not provided, defaulting to empty array");
    s.relations = [];
  }
  if (!Array.isArray(s.relations)) {
    const error = "schema.relations must be an array";
    console.error("ERROR:", error);
    throw new Error(error);
  }
  console.error("Number of relations:", s.relations.length);

  // Validate and normalize tables structure
  const validatedTables = [];
  for (let i = 0; i < s.tables.length; i++) {
    const table = (s.tables as unknown[])[i];
    console.error(`\nValidating table ${i + 1}/${s.tables.length}...`);

    if (!table || typeof table !== "object") {
      const error = `Table ${i}: must be an object`;
      console.error("ERROR:", error);
      throw new Error(error);
    }
    const t = table as Record<string, unknown>;
    console.error(`Table ${i} data:`, JSON.stringify(t, null, 2));

    if (typeof t.id !== "string" || typeof t.name !== "string") {
      const error = `Table ${i}: missing id or name. Got: ${JSON.stringify(t)}`;
      console.error("ERROR:", error);
      throw new Error(error);
    }
    console.error(`Table name: ${t.name}, id: ${t.id}`);

    if (!Array.isArray(t.columns)) {
      const error = `Table '${t.name}': must have a columns array`;
      console.error("ERROR:", error);
      throw new Error(error);
    }
    console.error(`Table '${t.name}' has ${t.columns.length} columns`);

    const validatedColumns = [];
    for (let j = 0; j < t.columns.length; j++) {
      const column = t.columns[j] as unknown;
      if (!column || typeof column !== "object") {
        const error = `Table '${t.name}', column ${j}: must be an object`;
        console.error("ERROR:", error);
        throw new Error(error);
      }
      const c = column as Record<string, unknown>;

      if (
        typeof c.id !== "string" ||
        typeof c.name !== "string" ||
        typeof c.type !== "string"
      ) {
        const error = `Table '${t.name}', column ${j}: must include string id, name, and type. Got: ${JSON.stringify(c)}`;
        console.error("ERROR:", error);
        throw new Error(error);
      }
      console.error(`  Column: ${c.name} (${c.type})`);

      // Normalize column with all fields
      validatedColumns.push({
        id: c.id,
        name: c.name,
        type: c.type,
        notNull: Boolean(c.notNull),
        primaryKey: Boolean(c.primaryKey),
        unique: Boolean(c.unique),
        defaultValue: typeof c.defaultValue === "string" ? c.defaultValue : undefined,
        check: typeof c.check === "string" ? c.check : undefined,
      });
    }

    // Normalize table with all fields
    const normalizedTable = {
      id: t.id,
      name: t.name,
      columns: validatedColumns,
      position: t.position && typeof t.position === "object" ? t.position : { x: 0, y: 0 },
      description: typeof t.description === "string" ? t.description : undefined,
      color: typeof t.color === "string" ? t.color : undefined,
    };
    console.error(`Table '${t.name}' validated successfully`);
    validatedTables.push(normalizedTable);
  }
  console.error(`\nAll ${validatedTables.length} tables validated`);

  // Validate and normalize relations structure
  console.error("\nValidating relations...");
  const validatedRelations = [];
  for (let i = 0; i < s.relations.length; i++) {
    const relation = (s.relations as unknown[])[i];
    console.error(`\nValidating relation ${i + 1}/${s.relations.length}...`);
    if (!relation || typeof relation !== "object") {
      throw new Error("schema.relations entries must be objects");
    }
    const r = relation as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.type !== "string") {
      throw new Error(`relation must include string id and type. Got: ${JSON.stringify(r)}`);
    }
    const from = r.from;
    const to = r.to;
    if (!from || typeof from !== "object" || !to || typeof to !== "object") {
      throw new Error(`relation '${r.id}' must include from/to objects`);
    }

    const fromObj = from as Record<string, unknown>;
    const toObj = to as Record<string, unknown>;
    if (
      typeof fromObj.tableId !== "string" ||
      typeof fromObj.columnId !== "string" ||
      typeof toObj.tableId !== "string" ||
      typeof toObj.columnId !== "string"
    ) {
      throw new Error(
        `relation '${r.id}': from/to must include tableId and columnId. Got: ${JSON.stringify({ from: fromObj, to: toObj })}`
      );
    }

    // Normalize relation
    validatedRelations.push({
      id: r.id,
      name: typeof r.name === "string" ? r.name : r.id,
      type: r.type,
      from: {
        tableId: fromObj.tableId,
        columnId: fromObj.columnId,
      },
      to: {
        tableId: toObj.tableId,
        columnId: toObj.columnId,
      },
      onDelete: typeof r.onDelete === "string" ? r.onDelete : undefined,
    });
  }

  // Return fully validated and normalized schema
  const finalSchema = {
    name,
    description: typeof s.description === "string" ? s.description : undefined,
    tables: validatedTables,
    relations: validatedRelations,
  } as DatabaseSchema;

  console.error("\n=== Schema parsing completed successfully ===");
  console.error("Final schema:", JSON.stringify(finalSchema, null, 2));

  return finalSchema;
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
