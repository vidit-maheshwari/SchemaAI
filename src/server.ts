import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as dotenv from "dotenv";
import { proxyServer, startSSEServer } from "mcp-proxy";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Proxy server for schema generator MCP
const mcpClient = new Client({ name: "schema-generator", version: "1.0.0" });

// Use tsx to run the MCP server
const mcpServerPath = join(__dirname, "schema-mcp-server.ts");
console.log("Starting Schema Generator MCP Server:", mcpServerPath);

const stdioTransport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", mcpServerPath],
});

console.log("Connecting to Schema Generator MCP Server...");
try {
  await mcpClient.connect(stdioTransport);
  console.log("Connected successfully!");
} catch (error) {
  console.error("Failed to connect to MCP server:", error);
  throw error;
}

await startSSEServer({
  port: parseInt(process.env.NEXT_PUBLIC_SERVER_PORT!),
  endpoint: "/sse",
  createServer: async () => {
    const server = new Server(
      {
        name: "schema-generator",
        version: "1.0.0",
      },
      {
        capabilities: mcpClient.getServerCapabilities() as Record<
          string,
          unknown
        >,
      }
    );
    proxyServer({
      server,
      client: mcpClient,
      serverCapabilities: mcpClient.getServerCapabilities() as Record<
        string,
        unknown
      >,
    });
    return server;
  },
});

console.log(`MCP Proxy Server running on port ${process.env.NEXT_PUBLIC_SERVER_PORT}`);
