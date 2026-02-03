"use client";

import React, { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TableNode } from "./nodes/table-node";
import { useSchemaStore } from "@/lib/store/schema-store";
import type { DatabaseSchema, Table } from "@/types/schema";

const nodeTypes = {
  table: TableNode,
};

interface SchemaCanvasProps {
  schema?: DatabaseSchema;
}

export function SchemaCanvas({ schema: schemaProp }: SchemaCanvasProps) {
  // Explicitly subscribe to store to ensure re-renders
  const storeSchema = useSchemaStore((state) => state.schema);
  const setSchema = useSchemaStore((state) => state.setSchema);
  const addRelation = useSchemaStore((state) => state.addRelation);
  const updateTable = useSchemaStore((state) => state.updateTable);

  type TableNodeData = Record<string, unknown> & { table: Table };
  type TableFlowNode = Node<TableNodeData, "table">;
  type TableFlowEdge = Edge;

  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<TableFlowEdge>([]);

  // Use provided schema or store schema, with fallback
  const activeSchema = schemaProp || storeSchema || {
    name: "Untitled Schema",
    tables: [],
    relations: []
  };

  // Sync schema to store immediately when provided (from AI)
  useEffect(() => {
    if (schemaProp) {
      console.log("[SchemaCanvas] Syncing AI schema to store:", schemaProp);
      setSchema(schemaProp);
    }
  }, [schemaProp, setSchema]);

  // Debug log
  console.log("[SchemaCanvas] Rendering with schema:", {
    hasProp: !!schemaProp,
    tables: activeSchema?.tables?.length || 0,
    relations: activeSchema?.relations?.length || 0
  });

  // Convert tables to React Flow nodes
  useEffect(() => {
    if (!activeSchema?.tables) return;

    const flowNodes: TableFlowNode[] = activeSchema.tables
      .filter((table) => table?.id)
      .map((table, index) => {
        // Ensure position has valid numbers
        const position = table.position?.x != null && table.position?.y != null
          ? { x: Number(table.position.x) || 0, y: Number(table.position.y) || 0 }
          : { x: 100 + (index * 300), y: 100 };

        return {
          id: table.id,
          type: "table",
          position,
          data: { table },
          draggable: true,
        };
      });

    setNodes(flowNodes);
  }, [activeSchema?.tables, setNodes]);

  // Convert relations to React Flow edges
  useEffect(() => {
    if (!activeSchema?.relations) return;

    const flowEdges: Edge[] = activeSchema.relations
      .filter((relation) => relation?.from?.tableId && relation?.to?.tableId)
      .map((relation) => ({
        id: relation.id,
        source: relation.from.tableId,
        target: relation.to.tableId,
        sourceHandle: "source",
        targetHandle: "target",
        type: "default",
        animated: true,
        style: { stroke: "#000000", strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#000000",
          width: 20,
          height: 20,
        },
        label: relation.name || relation.type,
        labelStyle: {
          fill: "#000000",
          fontWeight: 700,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: "#FFFFFF",
          stroke: "#000000",
          strokeWidth: 2,
        },
      }));

    setEdges(flowEdges);
  }, [activeSchema?.relations, setEdges]);

  // Handle connection creation (new relationship)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Create a new relation
      addRelation({
        from: {
          tableId: connection.source,
          columnId: "", // TODO: Allow column selection
        },
        to: {
          tableId: connection.target,
          columnId: "", // TODO: Allow column selection
        },
        type: "many-to-one",
      });

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
          },
          eds
        )
      );
    },
    [addRelation, setEdges]
  );

  // Handle node drag end (update table position)
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateTable(node.id, { position: node.position });
    },
    [updateTable]
  );


  const minimapNodeColor = useCallback((node: Node) => {
    const table = (node.data as TableNodeData | undefined)?.table;
    return table?.color || "#FFD700";
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {!activeSchema?.tables || activeSchema.tables.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center p-8">
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
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: "#000000", strokeWidth: 3 },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={2}
            color="#000000"
            style={{ opacity: 0.15 }}
          />
          <Controls
            className="!border-4 !border-black nb-shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
            }}
          />
          <MiniMap
            nodeColor={minimapNodeColor}
            className="!border-4 !border-black nb-shadow-sm"
            style={{
              backgroundColor: "#FFFFFF",
            }}
          />
        </ReactFlow>
      )}
    </div>
  );
}
