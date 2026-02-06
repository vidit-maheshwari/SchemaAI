import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
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

const { close } = await startSSEServer({
  port: parseInt(process.env.NEXT_PUBLIC_SERVER_PORT!),
  endpoint: "/sse",
  onUnhandledRequest: async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/validate") {
      const accessToken =
        url.searchParams.get("supabase_access_token") ||
        url.searchParams.get("supabaseAccessToken") ||
        "";

      if (!accessToken) {
        res
          .writeHead(400, { "Content-Type": "application/json" })
          .end(JSON.stringify({ ok: false, reason: "missing_token" }));
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const validationRes = await fetch("https://api.supabase.com/v1/projects", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        if (validationRes.ok) {
          res
            .writeHead(200, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: true }));
          return;
        }

        if (validationRes.status === 401 || validationRes.status === 403) {
          res
            .writeHead(401, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: false, reason: "unauthorized" }));
          return;
        }

        res
          .writeHead(502, { "Content-Type": "application/json" })
          .end(JSON.stringify({ ok: false, reason: "supabase_error" }));
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          res
            .writeHead(504, { "Content-Type": "application/json" })
            .end(JSON.stringify({ ok: false, reason: "timeout" }));
          return;
        }
        res
          .writeHead(502, { "Content-Type": "application/json" })
          .end(JSON.stringify({ ok: false, reason: "supabase_error" }));
        return;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    res.writeHead(404).end();
  },
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

    const baseEnv = {
      ...getDefaultEnvironment(),
      NODE_ENV: process.env.NODE_ENV ?? "development",
    };

    const stdioTransport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", mcpServerPath],
      env: {
        ...baseEnv,
        SUPABASE_ACCESS_TOKEN: accessToken,
      },
    });

    try {
      await mcpClient.connect(stdioTransport);
    } catch {
      await Promise.allSettled([mcpClient.close(), stdioTransport.close()]);
      throw new Response("Failed to start MCP server", {
        status: 500,
        statusText: "Internal Server Error",
      });
    }

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
