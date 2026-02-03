import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

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

  throw new Error(`Unknown tool: ${request.params.name}`);
});

function generateSchemaFromDescription(description: string): any {
  const lowerDesc = description.toLowerCase();

  // Simple keyword-based schema generation
  const tables: any[] = [];
  let tableId = 0;
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
  const relations: any[] = [];
  let relId = 0;

  // Auto-detect foreign keys and create relations
  tables.forEach((table, i) => {
    table.columns.forEach((col: any) => {
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
