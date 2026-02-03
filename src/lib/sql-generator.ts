import type { DatabaseSchema, Table, Column, Relation } from "@/types/schema";

export interface GenerateSqlOptions {
  /** Postgres schema name (e.g. "public"). Only used when `qualifyTables` is true. */
  schemaName?: string;
  /** Whether to prefix tables with the schema name (e.g. public.users). */
  qualifyTables?: boolean;
  /** Include the header comment with schema name and generation timestamp. */
  includeHeader?: boolean;
  /** Include foreign key constraints (generated as ALTER TABLE statements). */
  includeForeignKeys?: boolean;
  /** Include indexes (primarily for foreign key columns). */
  includeIndexes?: boolean;
  /** Include COMMENT ON statements for tables. */
  includeComments?: boolean;
  /** Use IF NOT EXISTS where supported (CREATE TABLE / CREATE INDEX). */
  idempotent?: boolean;
}

/**
 * Generate PostgreSQL DDL from a database schema
 */
export function generateSQL(
  schema: DatabaseSchema,
  options: GenerateSqlOptions = {}
): string {
  const sections: string[] = [];

  const resolvedOptions: Required<
    Pick<
      GenerateSqlOptions,
      | "qualifyTables"
      | "includeHeader"
      | "includeForeignKeys"
      | "includeIndexes"
      | "includeComments"
      | "idempotent"
    >
  > &
    Pick<GenerateSqlOptions, "schemaName"> = {
    schemaName: options.schemaName,
    qualifyTables: options.qualifyTables ?? false,
    includeHeader: options.includeHeader ?? true,
    includeForeignKeys: options.includeForeignKeys ?? true,
    includeIndexes: options.includeIndexes ?? true,
    includeComments: options.includeComments ?? true,
    idempotent: options.idempotent ?? true,
  };

  // Header comment
  if (resolvedOptions.includeHeader) {
    sections.push(`-- Generated Schema: ${schema.name}`);
    if (schema.description) {
      sections.push(`-- ${schema.description}`);
    }
    sections.push(`-- Generated at: ${new Date().toISOString()}`);
    sections.push("");
  }

  // Generate CREATE TABLE statements
  sections.push("-- ================================================");
  sections.push("-- CREATE TABLES");
  sections.push("-- ================================================");
  sections.push("");

  for (const table of schema.tables) {
    sections.push(generateCreateTable(table, resolvedOptions));
    sections.push("");
  }

  // Generate foreign key constraints
  if (resolvedOptions.includeForeignKeys && schema.relations.length > 0) {
    sections.push("-- ================================================");
    sections.push("-- FOREIGN KEY CONSTRAINTS");
    sections.push("-- ================================================");
    sections.push("");

    for (const relation of schema.relations) {
      const fkSql = generateForeignKey(relation, schema, resolvedOptions);
      if (fkSql) {
        sections.push(fkSql);
        sections.push("");
      }
    }
  }

  // Generate indexes for foreign keys
  if (resolvedOptions.includeIndexes) {
    sections.push("-- ================================================");
    sections.push("-- INDEXES");
    sections.push("-- ================================================");
    sections.push("");

    for (const relation of schema.relations) {
      const indexSql = generateIndexForForeignKey(relation, schema, resolvedOptions);
      if (indexSql) {
        sections.push(indexSql);
        sections.push("");
      }
    }
  }

  return sections.join("\n");
}

/**
 * Generate CREATE TABLE statement for a single table
 */
function generateCreateTable(
  table: Table,
  options: Required<
    Pick<
      GenerateSqlOptions,
      "qualifyTables" | "includeComments" | "idempotent"
    >
  > &
    Pick<GenerateSqlOptions, "schemaName">
): string {
  const lines: string[] = [];

  const tableRef = getTableRef(table.name, options);
  lines.push(
    `CREATE TABLE ${options.idempotent ? "IF NOT EXISTS " : ""}${tableRef} (`
  );

  // Generate column definitions
  const columnDefs = table.columns.map((col, index) => {
    const isLast = index === table.columns.length - 1;
    return "  " + generateColumnDefinition(col) + (isLast ? "" : ",");
  });

  lines.push(...columnDefs);
  lines.push(");");

  // Add table comment if description exists
  if (options.includeComments && table.description) {
    lines.push("");
    lines.push(
      `COMMENT ON TABLE ${tableRef} IS '${escapeString(table.description)}';`
    );
  }

  return lines.join("\n");
}

/**
 * Generate column definition
 */
function generateColumnDefinition(column: Column): string {
  const parts: string[] = [quoteIdent(column.name), column.type.toUpperCase()];

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
    assertSafeSqlExpression(column.defaultValue, `defaultValue for ${column.name}`);
    parts.push(`DEFAULT ${column.defaultValue}`);
  }

  if (column.check) {
    assertSafeSqlExpression(column.check, `check for ${column.name}`);
    parts.push(`CHECK (${column.check})`);
  }

  return parts.join(" ");
}

/**
 * Generate foreign key constraint
 */
function generateForeignKey(
  relation: Relation,
  schema: DatabaseSchema,
  options: Required<Pick<GenerateSqlOptions, "qualifyTables">> &
    Pick<GenerateSqlOptions, "schemaName">
): string | null {
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
    `ALTER TABLE ${getTableRef(fromTable.name, options)}`,
    `ADD CONSTRAINT ${quoteIdent(constraintName)}`,
    `FOREIGN KEY (${quoteIdent(fromColName)})`,
    `REFERENCES ${getTableRef(toTable.name, options)}(${quoteIdent(toColName)})`,
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
function generateIndexForForeignKey(
  relation: Relation,
  schema: DatabaseSchema,
  options: Required<
    Pick<GenerateSqlOptions, "qualifyTables" | "idempotent">
  > &
    Pick<GenerateSqlOptions, "schemaName">
): string | null {
  const fromTable = schema.tables.find((t) => t.id === relation.from.tableId);
  if (!fromTable) return null;

  const fromColumn = fromTable.columns.find((c) => c.id === relation.from.columnId);
  if (!fromColumn) return null;

  const indexName = `idx_${fromTable.name}_${fromColumn.name}`;

  return `CREATE INDEX ${options.idempotent ? "IF NOT EXISTS " : ""}${quoteIdent(indexName)} ON ${getTableRef(fromTable.name, options)}(${quoteIdent(fromColumn.name)});`;
}

/**
 * Escape single quotes in SQL strings
 */
function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

function assertSafeSqlExpression(expr: string, label: string): void {
  if (/[;]|--|\/\*/.test(expr)) {
    throw new Error(
      `${label} contains disallowed characters (semicolons or SQL comments)`
    );
  }
}

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

function getTableRef(
  tableName: string,
  options: Pick<GenerateSqlOptions, "qualifyTables" | "schemaName">
): string {
  if (options.qualifyTables) {
    const schemaName = options.schemaName || "public";
    return `${quoteIdent(schemaName)}.${quoteIdent(tableName)}`;
  }

  return quoteIdent(tableName);
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
