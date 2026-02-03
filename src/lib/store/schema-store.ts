import { create } from "zustand";
import type { DatabaseSchema, Table, Column, Relation } from "@/types/schema";
import { NEUBRUTALISM_COLORS } from "@/types/schema";

interface SchemaStore {
  schema: DatabaseSchema;
  selectedTableId: string | null;
  selectedColumnId: string | null;

  // Schema operations
  setSchema: (schema: DatabaseSchema) => void;
  resetSchema: () => void;

  // Table operations
  addTable: (table: Omit<Table, "id">) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  setSelectedTable: (id: string | null) => void;

  // Column operations
  addColumn: (tableId: string, column: Omit<Column, "id">) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
  setSelectedColumn: (columnId: string | null) => void;

  // Relation operations
  addRelation: (relation: Omit<Relation, "id">) => void;
  updateRelation: (id: string, updates: Partial<Relation>) => void;
  deleteRelation: (id: string) => void;

  // Utility functions
  getTable: (id: string) => Table | undefined;
  getColumn: (tableId: string, columnId: string) => Column | undefined;
  getRelation: (id: string) => Relation | undefined;
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getNextColor = (existingTables: Table[]) => {
  const usedColors = existingTables.map((t) => t.color).filter(Boolean);
  const availableColors = NEUBRUTALISM_COLORS.filter((c) => !usedColors.includes(c));
  return availableColors[0] || NEUBRUTALISM_COLORS[0];
};

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  schema: {
    name: "Untitled Schema",
    tables: [],
    relations: [],
  },
  selectedTableId: null,
  selectedColumnId: null,

  // Schema operations
  setSchema: (schema) =>
    set({
      schema: {
        name: schema?.name || "Untitled Schema",
        description: schema?.description,
        tables: (schema?.tables || []).map((table, index) => ({
          ...table,
          color: table.color || NEUBRUTALISM_COLORS[index % NEUBRUTALISM_COLORS.length],
        })),
        relations: schema?.relations || [],
      },
    }),

  resetSchema: () =>
    set({
      schema: {
        name: "Untitled Schema",
        tables: [],
        relations: [],
      },
      selectedTableId: null,
      selectedColumnId: null,
    }),

  // Table operations
  addTable: (table) =>
    set((state) => {
      const newTable: Table = {
        ...table,
        id: table.name.toLowerCase().replace(/\s+/g, "_"),
        color: table.color || getNextColor(state.schema.tables),
        columns: table.columns || [],
      };
      return {
        schema: {
          ...state.schema,
          tables: [...state.schema.tables, newTable],
        },
      };
    }),

  updateTable: (id, updates) =>
    set((state) => ({
      schema: {
        ...state.schema,
        tables: state.schema.tables.map((table) =>
          table.id === id ? { ...table, ...updates } : table
        ),
      },
    })),

  deleteTable: (id) =>
    set((state) => ({
      schema: {
        ...state.schema,
        tables: state.schema.tables.filter((table) => table.id !== id),
        relations: state.schema.relations.filter(
          (rel) => rel.from.tableId !== id && rel.to.tableId !== id
        ),
      },
      selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
    })),

  setSelectedTable: (id) => set({ selectedTableId: id }),

  // Column operations
  addColumn: (tableId, column) =>
    set((state) => {
      const newColumn: Column = {
        ...column,
        id: generateId(),
      };
      return {
        schema: {
          ...state.schema,
          tables: state.schema.tables.map((table) =>
            table.id === tableId
              ? { ...table, columns: [...table.columns, newColumn] }
              : table
          ),
        },
      };
    }),

  updateColumn: (tableId, columnId, updates) =>
    set((state) => ({
      schema: {
        ...state.schema,
        tables: state.schema.tables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                columns: table.columns.map((col) =>
                  col.id === columnId ? { ...col, ...updates } : col
                ),
              }
            : table
        ),
      },
    })),

  deleteColumn: (tableId, columnId) =>
    set((state) => ({
      schema: {
        ...state.schema,
        tables: state.schema.tables.map((table) =>
          table.id === tableId
            ? { ...table, columns: table.columns.filter((col) => col.id !== columnId) }
            : table
        ),
        relations: state.schema.relations.filter(
          (rel) =>
            !(rel.from.tableId === tableId && rel.from.columnId === columnId) &&
            !(rel.to.tableId === tableId && rel.to.columnId === columnId)
        ),
      },
      selectedColumnId: state.selectedColumnId === columnId ? null : state.selectedColumnId,
    })),

  setSelectedColumn: (columnId) => set({ selectedColumnId: columnId }),

  // Relation operations
  addRelation: (relation) =>
    set((state) => {
      const newRelation: Relation = {
        ...relation,
        id: generateId(),
      };
      return {
        schema: {
          ...state.schema,
          relations: [...state.schema.relations, newRelation],
        },
      };
    }),

  updateRelation: (id, updates) =>
    set((state) => ({
      schema: {
        ...state.schema,
        relations: state.schema.relations.map((rel) =>
          rel.id === id ? { ...rel, ...updates } : rel
        ),
      },
    })),

  deleteRelation: (id) =>
    set((state) => ({
      schema: {
        ...state.schema,
        relations: state.schema.relations.filter((rel) => rel.id !== id),
      },
    })),

  // Utility functions
  getTable: (id) => get().schema.tables.find((table) => table.id === id),

  getColumn: (tableId, columnId) => {
    const table = get().getTable(tableId);
    return table?.columns.find((col) => col.id === columnId);
  },

  getRelation: (id) => get().schema.relations.find((rel) => rel.id === id),
}));
