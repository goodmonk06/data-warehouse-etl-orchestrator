import * as duckdb from 'duckdb';
import { TargetConnector, DuckDBTargetConfig } from './types';

export class DuckDBTargetConnector implements TargetConnector {
  private db: duckdb.Database | null = null;
  private connection: duckdb.Connection | null = null;
  private config: DuckDBTargetConfig;

  constructor(config: DuckDBTargetConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new duckdb.Database(this.config.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.connection = this.db!.connect((connErr) => {
          if (connErr) {
            reject(connErr);
            return;
          }
          resolve();
        });
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connection) {
        this.connection.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          if (this.db) {
            this.db.close((dbErr) => {
              if (dbErr) reject(dbErr);
              else resolve();
            });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async load(tableName: string, data: any[], schema?: Record<string, string>): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to DuckDB');
    }

    if (data.length === 0) {
      return;
    }

    // Create table if it doesn't exist
    await this.createTableIfNotExists(tableName, data[0], schema);

    // Insert data in batches
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await this.insertBatch(tableName, batch);
    }
  }

  private async createTableIfNotExists(
    tableName: string,
    sampleRow: any,
    schema?: Record<string, string>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const columns = schema
        ? Object.entries(schema)
            .map(([col, type]) => `${col} ${type}`)
            .join(', ')
        : Object.keys(sampleRow)
            .map((key) => `${key} VARCHAR`)
            .join(', ');

      const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;

      this.connection!.run(createTableSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async insertBatch(tableName: string, batch: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const columns = Object.keys(batch[0]);
      const placeholders = batch
        .map(
          (_, idx) =>
            `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`
        )
        .join(', ');

      const values = batch.flatMap((row) => columns.map((col) => row[col]));

      const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;

      this.connection!.run(insertSQL, ...values, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
