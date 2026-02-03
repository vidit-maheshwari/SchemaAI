/**
 * Database Schema Type Definitions
 * Represents the core data model for the schema designer
 */

export type PostgresType =
  | "uuid"
  | "text"
  | "varchar"
  | "integer"
  | "bigint"
  | "smallint"
  | "decimal"
  | "numeric"
  | "real"
  | "double precision"
  | "boolean"
  | "date"
  | "timestamp"
  | "timestamptz"
  | "time"
  | "timetz"
  | "interval"
  | "jsonb"
  | "json"
  | "bytea"
  | "array"
  | "serial"
  | "bigserial";

export interface Column {
  id: string;
  name: string;
  type: PostgresType;
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
  defaultValue?: string;
  check?: string;
  references?: {
    table: string;
    column: string;
  };
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  position: {
    x: number;
    y: number;
  };
  columns: Column[];
  color?: string; // For Neubrutalism styling
}

export type RelationType = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";

export interface Relation {
  id: string;
  name?: string;
  from: {
    tableId: string;
    columnId: string;
  };
  to: {
    tableId: string;
    columnId: string;
  };
  type: RelationType;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
  onUpdate?: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION";
}

export interface DatabaseSchema {
  id?: string;
  name: string;
  description?: string;
  tables: Table[];
  relations: Relation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SchemaVersion {
  id: string;
  schemaId: string;
  version: number;
  schema: DatabaseSchema;
  createdAt: string;
}

// Neubrutalism color palette for table nodes
export const NEUBRUTALISM_COLORS = [
  "#FFD700", // Gold
  "#FF69B4", // Hot Pink
  "#00FFFF", // Cyan
  "#7FFF00", // Chartreuse
  "#FF6347", // Tomato
  "#9370DB", // Medium Purple
  "#FFB6C1", // Light Pink
  "#98FB98", // Pale Green
  "#DDA0DD", // Plum
  "#F0E68C", // Khaki
] as const;
