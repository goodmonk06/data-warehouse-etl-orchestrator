export interface SourceConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  extract(): Promise<any[]>;
}

export interface TargetConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  load(tableName: string, data: any[], schema?: Record<string, string>): Promise<void>;
}

export interface PostgresSourceConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  query: string;
}

export interface ApiSourceConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  dataPath?: string; // JSONPath to extract data from response
}

export interface DuckDBTargetConfig {
  dbPath: string;
}

export interface WarehouseTableConfig {
  tableName: string;
  schema?: Record<string, string>;
}
