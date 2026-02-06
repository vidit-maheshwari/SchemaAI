"use client";

import React, { useState } from "react";
import { Plus, Download, Copy, Trash2, FileCode, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSchemaStore } from "@/lib/store/schema-store";
import { downloadSQL, copySQL } from "@/lib/sql-generator";
import { NEUBRUTALISM_COLORS } from "@/types/schema";
import { useAuth } from "@/lib/supabase/auth-provider";

interface ToolbarProps {
  onShowSQL?: () => void;
}

export function Toolbar({ onShowSQL }: ToolbarProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { addTable, resetSchema, schema } = useSchemaStore();
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleAddTable = () => {
    const tableNumber = schema.tables.length + 1;
    const colorIndex = (schema.tables.length) % NEUBRUTALISM_COLORS.length;

    addTable({
      name: `table_${tableNumber}`,
      position: {
        x: 100 + (schema.tables.length * 50),
        y: 100 + (schema.tables.length * 50),
      },
      columns: [
        {
          id: `col_${Date.now()}`,
          name: "id",
          type: "uuid",
          primaryKey: true,
          notNull: true,
          defaultValue: "gen_random_uuid()",
        },
      ],
      color: NEUBRUTALISM_COLORS[colorIndex],
    });
  };

  const handleDownloadSQL = () => {
    downloadSQL(schema);
  };

  const handleCopySQL = async () => {
    const success = await copySQL(schema);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to clear the entire schema? This cannot be undone.")) {
      resetSchema();
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    void signOut().finally(() => {
      setLoggingOut(false);
      router.replace("/login");
    });
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b-4 border-black bg-white">
      {/* Add Table Button */}
      <button
        onClick={handleAddTable}
        className="nb-btn bg-yellow-300 hover:bg-yellow-400 gap-2"
        title="Add new table"
      >
        <Plus size={18} />
        <span>Add Table</span>
      </button>

      {/* Divider */}
      <div className="w-0.5 h-8 bg-gray-300 mx-1"></div>

      {/* View SQL Button */}
      <button
        onClick={onShowSQL}
        className="nb-btn bg-cyan-300 hover:bg-cyan-400 gap-2"
        title="View generated SQL"
      >
        <FileCode size={18} />
        <span>View SQL</span>
      </button>

      {/* Download SQL Button */}
      <button
        onClick={handleDownloadSQL}
        className="nb-btn bg-pink-300 hover:bg-pink-400 gap-2"
        title="Download SQL file"
      >
        <Download size={18} />
        <span>Download</span>
      </button>

      {/* Copy SQL Button */}
      <button
        onClick={handleCopySQL}
        className="nb-btn bg-lime-300 hover:bg-lime-400 gap-2 min-w-[120px]"
        title="Copy SQL to clipboard"
      >
        <Copy size={18} />
        <span>{copied ? "Copied!" : "Copy SQL"}</span>
      </button>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Schema Info */}
      <div className="nb-card px-4 py-2.5 bg-indigo-100">
        <div className="font-mono text-sm font-bold text-black">
          {schema.tables.length} tables, {schema.relations.length} relations
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="nb-btn bg-orange-200 hover:bg-orange-300 gap-2"
        title="Log out"
        disabled={loggingOut}
      >
        <LogOut size={18} />
        <span>{loggingOut ? "Logging out..." : "Log out"}</span>
      </button>

      {/* Divider */}
      <div className="w-0.5 h-8 bg-gray-300 mx-1"></div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="nb-btn bg-red-300 hover:bg-red-400 gap-2"
        title="Clear schema"
      >
        <Trash2 size={18} />
        <span>Reset</span>
      </button>
    </div>
  );
}
