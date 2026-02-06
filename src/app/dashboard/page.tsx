"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageThreadFull } from "@/components/ui/message-thread-full";
import { CanvasSpace } from "@/components/ui/canvas-space";
import { Toolbar } from "@/components/toolbar";
import { TableEditor } from "@/components/table-editor";
import { SQLExportPanel } from "@/components/sql-export-panel";
import { SupabaseMcpConnectModal } from "@/components/supabase-mcp-connect-modal";
import { clearSupabaseMcpToken } from "@/lib/supabase/mcp-token";
import { useAuth } from "@/lib/supabase/auth-provider";
import { useSupabaseMcpConnection } from "@/lib/supabase/use-mcp-token";
import { validateSupabaseAccessToken } from "@/lib/supabase/validate-access-token";

export default function DashboardPage() {
  const router = useRouter();
  const { loading, user, signOut } = useAuth();
  const { token } = useSupabaseMcpConnection(user?.id);
  const [showSQL, setShowSQL] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user?.id || !token) return;

    let cancelled = false;

    void (async () => {
      setValidatingToken(true);
      try {
        const validation = await validateSupabaseAccessToken(token);
        if (cancelled) return;

        if (!validation.ok) {
          clearSupabaseMcpToken(user.id);
        }
      } finally {
        if (!cancelled) {
          setValidatingToken(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="font-mono text-sm text-gray-800">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!token) {
    return (
      <SupabaseMcpConnectModal
        userId={user.id}
        onLogout={() => {
          void signOut().finally(() => {
            router.replace("/login");
          });
        }}
      />
    );
  }

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="font-mono text-sm text-gray-800">
          Validating Supabase token...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* AI Chat Sidebar */}
        <aside className="w-[380px] border-r-4 border-black flex flex-col bg-indigo-50">
          <div className="px-5 py-4 border-b-4 border-black bg-indigo-100">
            <h2 className="font-bold uppercase text-base tracking-wide text-black">
              AI Assistant
            </h2>
            <p className="text-sm font-mono mt-1.5 text-gray-800">
              Describe your schema in natural language
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <MessageThreadFull contextKey="schema-designer" />
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 flex flex-col bg-gray-50">
          <Toolbar onShowSQL={() => setShowSQL(true)} />
          <div className="flex-1 relative">
            <CanvasSpace />
          </div>
        </main>

        {/* Table Editor Sidebar */}
        <aside className="w-[380px] border-l-4 border-black bg-purple-50">
          <div className="px-5 py-4 border-b-4 border-black bg-purple-100">
            <h2 className="font-bold uppercase text-base tracking-wide text-black">
              Table Editor
            </h2>
            <p className="text-sm font-mono mt-1.5 text-gray-800">
              Edit selected table properties
            </p>
          </div>
          <TableEditor />
        </aside>
      </div>

      {/* SQL Export Modal */}
      {showSQL && <SQLExportPanel onClose={() => setShowSQL(false)} />}
    </div>
  );
}
