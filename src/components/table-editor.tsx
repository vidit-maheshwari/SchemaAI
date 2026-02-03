"use client";

import React, { useState } from "react";
import { useSchemaStore } from "@/lib/store/schema-store";
import { Plus, Trash2, Key, Lock, Check } from "lucide-react";
import type { PostgresType } from "@/types/schema";

const POSTGRES_TYPES: PostgresType[] = [
  "uuid",
  "text",
  "varchar",
  "integer",
  "bigint",
  "boolean",
  "timestamp",
  "timestamptz",
  "date",
  "jsonb",
  "serial",
  "bigserial",
];

export function TableEditor() {
  const { selectedTableId, getTable, updateTable, addColumn, deleteColumn, updateColumn } =
    useSchemaStore();

  const table = selectedTableId ? getTable(selectedTableId) : null;
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<PostgresType>("text");

  if (!table) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="nb-card p-8 bg-gradient-to-br from-orange-100 to-pink-100 text-center max-w-xs">
          <div className="mb-5">
            <div className="inline-block p-4 bg-white border-4 border-black nb-shadow-sm">
              <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <p className="font-bold text-base mb-2 uppercase tracking-wide text-black">
            No Table Selected
          </p>
          <p className="text-sm font-mono text-gray-800 leading-relaxed">
            Click on a table in the canvas to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;

    addColumn(table.id, {
      name: newColumnName.trim(),
      type: newColumnType,
      notNull: false,
      primaryKey: false,
      unique: false,
    });

    setNewColumnName("");
    setNewColumnType("text");
  };

  const handleDeleteColumn = (columnId: string) => {
    if (confirm("Delete this column?")) {
      deleteColumn(table.id, columnId);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      {/* Table Name Section */}
      <div className="nb-card p-5 bg-yellow-100">
        <label className="block font-bold mb-2.5 uppercase text-sm tracking-wide text-black">
          Table Name
        </label>
        <input
          type="text"
          value={table.name}
          onChange={(e) => updateTable(table.id, { name: e.target.value })}
          className="nb-input w-full bg-white"
          placeholder="table_name"
        />
      </div>

      {/* Table Description */}
      <div className="nb-card p-5 bg-cyan-100">
        <label className="block font-bold mb-2.5 uppercase text-sm tracking-wide text-black">
          Description (Optional)
        </label>
        <textarea
          value={table.description || ""}
          onChange={(e) => updateTable(table.id, { description: e.target.value })}
          className="nb-input w-full bg-white resize-none"
          rows={3}
          placeholder="Table description..."
        />
      </div>

      {/* Columns Section */}
      <div className="nb-card p-5 bg-pink-100">
        <h3 className="font-bold uppercase text-base mb-4 tracking-wide text-black">
          Columns
        </h3>

        {/* Existing Columns */}
        <div className="space-y-3 mb-5">
          {table.columns.map((column) => (
            <div key={column.id} className="nb-card p-4 bg-white">
              <div className="flex items-start gap-2.5">
                <div className="flex-1 space-y-2.5">
                  {/* Column Name */}
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) =>
                      updateColumn(table.id, column.id, { name: e.target.value })
                    }
                    className="nb-input w-full font-mono font-bold"
                    placeholder="column_name"
                  />

                  {/* Column Type */}
                  <select
                    value={column.type}
                    onChange={(e) =>
                      updateColumn(table.id, column.id, {
                        type: e.target.value as PostgresType,
                      })
                    }
                    className="nb-select w-full"
                  >
                    {POSTGRES_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  {/* Constraints */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.primaryKey || false}
                        onChange={(e) =>
                          updateColumn(table.id, column.id, {
                            primaryKey: e.target.checked,
                            notNull: e.target.checked || column.notNull,
                          })
                        }
                        className="w-4 h-4 border-3 border-black"
                      />
                      <Key size={14} className="text-black" />
                      <span className="font-mono text-xs font-bold text-black">PRIMARY KEY</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.notNull || false}
                        onChange={(e) =>
                          updateColumn(table.id, column.id, { notNull: e.target.checked })
                        }
                        className="w-4 h-4 border-3 border-black"
                        disabled={column.primaryKey}
                      />
                      <Lock size={14} className="text-black" />
                      <span className="font-mono text-xs font-bold text-black">NOT NULL</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={column.unique || false}
                        onChange={(e) =>
                          updateColumn(table.id, column.id, { unique: e.target.checked })
                        }
                        className="w-4 h-4 border-3 border-black"
                      />
                      <Check size={14} className="text-black" />
                      <span className="font-mono text-xs font-bold text-black">UNIQUE</span>
                    </label>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteColumn(column.id)}
                  className="p-2.5 bg-red-300 border-3 border-black hover:bg-red-400 nb-shadow-sm flex items-center justify-center"
                  title="Delete column"
                >
                  <Trash2 size={16} className="text-black" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Column Form */}
        <div className="border-t-3 border-black pt-4">
          <h4 className="font-bold uppercase text-xs mb-3 tracking-wide text-black">
            Add New Column
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddColumn()}
              className="nb-input w-full font-mono"
              placeholder="column_name"
            />
            <div className="flex gap-2">
              <select
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value as PostgresType)}
                className="nb-select flex-1"
              >
                {POSTGRES_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddColumn}
                className="nb-btn bg-lime-300 hover:bg-lime-400 gap-2"
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
