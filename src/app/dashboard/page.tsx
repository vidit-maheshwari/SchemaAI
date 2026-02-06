"use client";
import { useState } from "react";
import { MessageThreadFull } from "@/components/ui/message-thread-full";
import { CanvasSpace } from "@/components/ui/canvas-space";
import { Toolbar } from "@/components/toolbar";
import { TableEditor } from "@/components/table-editor";
import { SQLExportPanel } from "@/components/sql-export-panel";
import { Database } from "lucide-react";

export default function DashboardPage() {
  const [showSQL, setShowSQL] = useState(false);

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
