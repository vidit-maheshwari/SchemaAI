"use client";

import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useSchemaStore } from "@/lib/store/schema-store";
import { generateSQL, downloadSQL, copySQL } from "@/lib/sql-generator";
import { X, Copy, Download, Check } from "lucide-react";

interface SQLExportPanelProps {
  onClose: () => void;
}

export function SQLExportPanel({ onClose }: SQLExportPanelProps) {
  const { schema } = useSchemaStore();
  const [copied, setCopied] = useState(false);

  const sql = generateSQL(schema);

  // Calculate accurate statistics
  const lines = sql.split("\n").length;
  const characters = sql.length;
  const words = sql.trim().split(/\s+/).filter(word => word.length > 0).length;

  const handleCopy = async () => {
    const success = await copySQL(schema);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadSQL(schema);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/50">
      <div className="w-full max-w-5xl h-[90vh] flex flex-col nb-card nb-shadow-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-black bg-yellow-300">
          <div>
            <h2 className="text-2xl font-bold uppercase">Generated SQL</h2>
            <p className="font-mono text-sm mt-1">PostgreSQL DDL for {schema.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-red-400 border-4 border-black hover:bg-red-500 transition-colors"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-3 p-4 border-b-4 border-black bg-cyan-200">
          <button
            onClick={handleCopy}
            className="nb-btn bg-pink-400 hover:bg-pink-500 flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy to Clipboard
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="nb-btn bg-lime-400 hover:bg-lime-500 flex items-center gap-2"
          >
            <Download size={18} />
            Download .sql File
          </button>

          <div className="flex-1"></div>

          <div className="nb-card px-4 py-2.5 bg-white">
            <span className="font-mono text-sm font-bold text-black">
              {lines} lines · {words} words · {characters} characters
            </span>
          </div>
        </div>

        {/* SQL Code */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {schema.tables.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="nb-card p-8 bg-yellow-200 text-center">
                <p className="font-bold text-lg mb-2">No Tables Yet</p>
                <p className="text-sm">Add some tables to generate SQL</p>
              </div>
            </div>
          ) : (
            <div className="nb-card overflow-hidden">
              <SyntaxHighlighter
                language="sql"
                style={a11yDark}
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  border: "4px solid black",
                  borderRadius: 0,
                }}
                showLineNumbers
              >
                {sql}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
