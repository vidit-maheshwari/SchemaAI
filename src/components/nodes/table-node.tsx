import React, { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { Table } from "@/types/schema";
import { useSchemaStore } from "@/lib/store/schema-store";
import { Trash2, Key, Lock } from "lucide-react";

interface TableNodeData extends Record<string, unknown> {
  table: Table;
}

type TableNodeType = Node<TableNodeData, "table">;

export const TableNode = memo(({ data, selected }: NodeProps<TableNodeType>) => {
  const { table } = data;
  const { deleteTable, setSelectedTable } = useSchemaStore();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete table "${table.name}"?`)) {
      deleteTable(table.id);
    }
  };

  const handleClick = () => {
    setSelectedTable(table.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`min-w-[280px] cursor-pointer transition-all ${
        selected ? "ring-4 ring-black" : ""
      }`}
      style={{ backgroundColor: table.color || "#FFD700" }}
    >
      {/* Table Header */}
      <div className="flex items-center justify-between border-b-4 border-black bg-black px-4 py-3">
        <h3 className="font-bold text-white uppercase tracking-wide">{table.name}</h3>
        <button
          onClick={handleDelete}
          className="text-white hover:text-red-400 transition-colors"
          title="Delete table"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Columns List */}
      <div className="p-4 space-y-2">
        {!table.columns || table.columns.length === 0 ? (
          <div className="text-center text-black/60 font-mono text-sm py-4">
            No columns yet
          </div>
        ) : (
          table.columns.map((column, index: number) => (
            <div
              key={column.id || `col-${index}`}
              className="flex items-center justify-between gap-3 font-mono text-sm group"
            >
              <div className="flex items-center gap-2 flex-1">
                {/* Column Icons */}
                <div className="flex gap-1">
                  {column.primaryKey && (
                    <Key size={14} className="text-yellow-600" />
                  )}
                  {column.notNull && (
                    <Lock size={14} className="text-red-600" />
                  )}
                </div>

                {/* Column Name */}
                <span className="font-bold text-black">{column.name}</span>
              </div>

              {/* Column Type */}
              <span className="text-black/70 text-xs uppercase">{column.type}</span>
            </div>
          ))
        )}
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!bg-white !border-4 !border-black"
        style={{ width: 12, height: 12 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!bg-white !border-4 !border-black"
        style={{ width: 12, height: 12 }}
      />
    </div>
  );
});

TableNode.displayName = "TableNode";
