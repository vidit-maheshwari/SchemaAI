import type { DatabaseSchema, Table, Column, Relation } from "@/types/schema";

/**
 * Generate PostgreSQL DDL from a database schema
 */
export function generateSQL(schema: DatabaseSchema): string {
  const sections: string[] = [];

  // Header comment
  sections.push(`-- Generated Schema: ${schema.name}`);
  if (schema.description) {
    sections.push(`-- ${schema.description}`);
  }
  sections.push(`-- Generated at: ${new Date().toISOString()}`);
  sections.push("");

  // Generate CREATE TABLE statements
  sections.push("-- ================================================");
  sections.push("-- CREATE TABLES");
  sections.push("-- ================================================");
  sections.push("");

  for (const table of schema.tables) {
    sections.push(generateCreateTable(table));
    sections.push("");
  }

  // Generate foreign key constraints
  if (schema.relations.length > 0) {
    sections.push("-- ================================================");
    sections.push("-- FOREIGN KEY CONSTRAINTS");
    sections.push("-- ================================================");
    sections.push("");

    for (const relation of schema.relations) {
      const fkSql = generateForeignKey(relation, schema);
      if (fkSql) {
        sections.push(fkSql);
        sections.push("");
      }
    }
  }

  // Generate indexes for foreign keys
  sections.push("-- ================================================");
  sections.push("-- INDEXES");
  sections.push("-- ================================================");
  sections.push("");

  for (const relation of schema.relations) {
    const indexSql = generateIndexForForeignKey(relation);
    if (indexSql) {
      sections.push(indexSql);
      sections.push("");
    }
  }

  return sections.join("\n");
}

/**
 * Generate CREATE TABLE statement for a single table
 */
function generateCreateTable(table: Table): string {
  const lines: string[] = [];

  lines.push(`CREATE TABLE ${table.name} (`);

  // Generate column definitions
  const columnDefs = table.columns.map((col, index) => {
    const isLast = index === table.columns.length - 1;
    return "  " + generateColumnDefinition(col) + (isLast ? "" : ",");
  });

  lines.push(...columnDefs);
  lines.push(");");

  // Add table comment if description exists
  if (table.description) {
    lines.push("");
    lines.push(`COMMENT ON TABLE ${table.name} IS '${escapeString(table.description)}';`);
  }

  return lines.join("\n");
}

/**
 * Generate column definition
 */
function generateColumnDefinition(column: Column): string {
  const parts: string[] = [column.name, column.type.toUpperCase()];

  // Add constraints
  if (column.primaryKey) {
    parts.push("PRIMARY KEY");
  }

  if (column.unique && !column.primaryKey) {
    parts.push("UNIQUE");
  }

  if (column.notNull && !column.primaryKey) {
    parts.push("NOT NULL");
  }

  if (column.defaultValue !== undefined && column.defaultValue !== "") {
    parts.push(`DEFAULT ${column.defaultValue}`);
  }

  if (column.check) {
    parts.push(`CHECK (${column.check})`);
  }

  return parts.join(" ");
}

/**
 * Generate foreign key constraint
 */
function generateForeignKey(relation: Relation, schema: DatabaseSchema): string | null {
  const fromTable = schema.tables.find((t) => t.id === relation.from.tableId);
  const toTable = schema.tables.find((t) => t.id === relation.to.tableId);

  if (!fromTable || !toTable) return null;

  const fromColumn = fromTable.columns.find((c) => c.id === relation.from.columnId);
  const toColumn = toTable.columns.find((c) => c.id === relation.to.columnId);

  // If no specific columns, try to infer
  const fromColName = fromColumn?.name || `${toTable.name}_id`;
  const toColName = toColumn?.name || "id";

  const constraintName = relation.name || `fk_${fromTable.name}_${toTable.name}`;

  const parts: string[] = [
    `ALTER TABLE ${fromTable.name}`,
    `ADD CONSTRAINT ${constraintName}`,
    `FOREIGN KEY (${fromColName})`,
    `REFERENCES ${toTable.name}(${toColName})`,
  ];

  if (relation.onDelete) {
    parts.push(`ON DELETE ${relation.onDelete}`);
  }

  if (relation.onUpdate) {
    parts.push(`ON UPDATE ${relation.onUpdate}`);
  }

  return parts.join("\n  ") + ";";
}

/**
 * Generate index for foreign key
 */
function generateIndexForForeignKey(relation: Relation): string | null {
  // Index name format: idx_tablename_columnname
  const indexName = `idx_${relation.from.tableId}_${relation.from.columnId}`;

  return `CREATE INDEX ${indexName} ON ${relation.from.tableId}(${relation.from.columnId});`;
}

/**
 * Escape single quotes in SQL strings
 */
function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Export schema as downloadable .sql file
 */
export function downloadSQL(schema: DatabaseSchema): void {
  const sql = generateSQL(schema);
  const blob = new Blob([sql], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schema.name.toLowerCase().replace(/\s+/g, "_")}.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy SQL to clipboard
 */
export async function copySQL(schema: DatabaseSchema): Promise<boolean> {
  try {
    const sql = generateSQL(schema);
    await navigator.clipboard.writeText(sql);
    return true;
  } catch (error) {
    console.error("Failed to copy SQL:", error);
    return false;
  }
}
