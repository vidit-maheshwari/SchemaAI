"use client";
import { useTambo } from "@tambo-ai/react";
import { useEffect, useState } from "react";
import { SchemaCanvas } from "@/components/schema-canvas";
import { useSchemaStore } from "@/lib/store/schema-store";

export const CanvasSpace = () => {
  const { thread } = useTambo();
  const schema = useSchemaStore((state) => state.schema);
  const [lastRenderedComponent, setLastRenderedComponent] =
    useState<React.ReactNode | null>(null);

  useEffect(() => {
    const lastMessage = thread?.messages[thread?.messages.length - 1];
    if (lastMessage?.renderedComponent) {
      setLastRenderedComponent(lastMessage.renderedComponent);
    }
  }, [thread]);

  // Always render SchemaCanvas if we have tables in the store
  const hasManualTables = schema.tables && schema.tables.length > 0;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full w-full">
        {lastRenderedComponent ? (
          // Render AI-generated component directly
          <div className="h-full w-full">{lastRenderedComponent}</div>
        ) : hasManualTables ? (
          // Render SchemaCanvas for manual tables
          <SchemaCanvas />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-8">
            <div className="nb-card p-10 bg-white text-center max-w-2xl">
              <div className="mb-6">
                <div className="inline-block p-5 bg-gradient-to-br from-yellow-200 to-pink-200 border-4 border-black nb-shadow-sm">
                  <svg className="w-14 h-14 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 uppercase tracking-tight text-black">
                Start Designing Your Schema
              </h3>
              <p className="text-gray-700 mb-8 font-mono text-sm leading-relaxed max-w-lg mx-auto">
                Use the AI assistant on the left to generate a schema by describing your database needs, or click <span className="font-bold text-black">&quot;Add Table&quot;</span> above to create tables manually.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="nb-card p-5 bg-cyan-100 text-left">
                  <div className="font-bold text-sm mb-2 uppercase tracking-wide text-black">
                    🤖 AI Generation
                  </div>
                  <div className="text-xs font-mono text-gray-800 leading-relaxed">
                    &quot;Create a blog schema with users and posts&quot;
                  </div>
                </div>
                <div className="nb-card p-5 bg-lime-100 text-left">
                  <div className="font-bold text-sm mb-2 uppercase tracking-wide text-black">
                    ✏️ Manual Design
                  </div>
                  <div className="text-xs font-mono text-gray-800 leading-relaxed">
                    Click &quot;Add Table&quot; and customize columns
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
