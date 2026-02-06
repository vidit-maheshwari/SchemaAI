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

// Use tsx to run the MCP server
const mcpServerPath = join(__dirname, "schema-mcp-server.ts");
console.log("Starting Schema Generator MCP Server:", mcpServerPath);

function getProcessEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }
  return env;
}

const { close } = await startSSEServer({
  port: parseInt(process.env.NEXT_PUBLIC_SERVER_PORT!),
  endpoint: "/sse",
  createServer: async (req) => {
    const url = new URL(req.url || "/", "http://localhost");
    const accessToken =
      url.searchParams.get("supabase_access_token") ||
      url.searchParams.get("supabaseAccessToken") ||
      "";

    if (!accessToken) {
      throw new Response("Missing Supabase access token", {
        status: 401,
        statusText: "Unauthorized",
      });
    }

    const mcpClient = new Client({ name: "schema-generator", version: "1.0.0" });

    const stdioTransport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", mcpServerPath],
      env: {
        ...getProcessEnv(),
        SUPABASE_ACCESS_TOKEN: accessToken,
      },
    });

    await mcpClient.connect(stdioTransport);

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

    return {
      connect: server.connect.bind(server),
      close: async () => {
        await Promise.allSettled([server.close(), mcpClient.close()]);
      },
    };
  },
});

const shutdown = async () => {
  try {
    await close();
  } finally {
    process.exit(0);
  }
};

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});

console.log(`MCP Proxy Server running on port ${process.env.NEXT_PUBLIC_SERVER_PORT}`);
