"use client";

import { useMemo, useState } from "react";
import {
  clearSupabaseMcpToken,
  setSupabaseMcpProjectUrl,
  setSupabaseMcpToken,
} from "@/lib/supabase/mcp-token";
import { validateSupabaseAccessToken } from "@/lib/supabase/validate-access-token";

export function SupabaseMcpConnectModal(props: {
  userId: string;
  onLogout: () => void;
}) {
  const [projectUrl, setProjectUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const tokenLooksValid = useMemo(() => token.trim().length >= 20, [token]);

  const onConnect = async () => {
    const normalizedToken = token.trim();
    const normalizedProjectUrl = projectUrl.trim();

    if (!normalizedToken) return;

    setConnecting(true);
    setError(null);
    try {
      const validation = await validateSupabaseAccessToken(normalizedToken);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }

      if (normalizedProjectUrl) {
        setSupabaseMcpProjectUrl(props.userId, normalizedProjectUrl);
      }

      setSupabaseMcpToken(props.userId, normalizedToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  };

  const onLogout = () => {
    clearSupabaseMcpToken(props.userId);
    props.onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="nb-card nb-shadow-lg w-full max-w-xl bg-white p-6">
        <h2 className="text-xl font-black tracking-tight text-black">
          Connect your Supabase MCP
        </h2>

        <p className="mt-2 text-sm font-mono text-gray-800">
          To run Supabase MCP tools, we need a Supabase personal access token.
          This token is stored locally in your browser (temporary approach).
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-black">
              Supabase Project URL (optional)
            </label>
            <input
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="https://app.supabase.com/project/..."
              className="nb-input mt-2 w-full"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black">
              Supabase Access Token
            </label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your token"
              type="password"
              className="nb-input mt-2 w-full"
              autoComplete="off"
            />
            <p className="mt-2 text-xs font-mono text-gray-700">
              Get one from your Supabase account settings → Access Tokens.
            </p>
          </div>

          {error ? (
            <div className="nb-card bg-red-50 px-4 py-3">
              <div className="text-sm font-mono text-red-800">
                {error}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onLogout}
            className="nb-btn bg-gray-200 hover:bg-gray-300"
            type="button"
            disabled={connecting}
          >
            Log out
          </button>

          <button
            onClick={onConnect}
            className="nb-btn bg-green-300 hover:bg-green-400"
            type="button"
            disabled={connecting || !tokenLooksValid}
            title={
              tokenLooksValid
                ? "Validate and connect"
                : "Token must be at least 20 characters"
            }
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
