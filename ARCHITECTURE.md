# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                             │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  MySQL  │  APIs  │  CSV  │  MongoDB  │  S3       │
│              │         │        │       │           │           │
│  • CRM DBs   │  App    │ REST   │ Files │  Logs     │  Data     │
│  • Analytics │  DBs    │ GraphQL│       │  Events   │  Lakes    │
└──────┬───────────────────────┬──────────────────────────────────┘
       │                       │
       │    ┌─────────────────┘
       │    │
       ▼    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ETL ORCHESTRATOR                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   Fastify    │◄────────┤   Next.js    │                      │
│  │   REST API   │         │      UI      │                      │
│  └──────┬───────┘         └──────────────┘                      │
│         │                                                         │
│         ├──► ┌─────────────────────────────┐                    │
│         │    │   Pipeline Executor         │                    │
│         │    │  ┌────────────────────┐    │                    │
│         │    │  │  1. Extract        │    │                    │
│         │    │  │  2. Transform      │    │                    │
│         │    │  │  3. Load           │    │                    │
│         │    │  └────────────────────┘    │                    │
│         │    └─────────────────────────────┘                    │
│         │                                                         │
│         ├──► ┌─────────────────────────────┐                    │
│         │    │   Cron Scheduler            │                    │
│         │    │  • Schedule pipelines       │                    │
│         │    │  • Manage execution         │                    │
│         │    └─────────────────────────────┘                    │
│         │                                                         │
│         └──► ┌─────────────────────────────┐                    │
│              │   Control Database          │                    │
│              │   (PostgreSQL + Prisma)     │                    │
│              │  • Sources                  │                    │
│              │  • Targets                  │                    │
│              │  • Pipelines                │                    │
│              │  • Runs & Logs              │                    │
│              └─────────────────────────────┘                    │
│                                                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA WAREHOUSE                              │
├─────────────────────────────────────────────────────────────────┤
│  DuckDB  │  PostgreSQL  │  BigQuery  │  Snowflake  │  Redshift │
│          │              │            │             │           │
│  • Fast  │  • OLAP      │  • Cloud   │  • Cloud    │  • AWS    │
│  • Local │  • Analytics │  • Scalable│  • Scalable │  • Scale  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BI & ANALYTICS TOOLS                          │
├─────────────────────────────────────────────────────────────────┤
│  Tableau  │  Power BI  │  Looker  │  Metabase  │  Superset     │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Source Connectors

**Purpose:** Extract data from various sources

**Implemented:**
- `PostgresSourceConnector` - PostgreSQL databases
- `ApiSourceConnector` - HTTP REST/JSON APIs

**Interface:**
```typescript
interface SourceConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  extract(): Promise<any[]>;
}
```

**Configuration:**
```json
{
  "type": "postgres",
  "configJson": {
    "host": "db.example.com",
    "port": 5432,
    "database": "mydb",
    "user": "user",
    "password": "pass",
    "query": "SELECT * FROM table"
  }
}
```

### 2. Target Connectors

**Purpose:** Load data into warehouse

**Implemented:**
- `DuckDBTargetConnector` - DuckDB warehouse

**Interface:**
```typescript
interface TargetConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  load(table: string, data: any[], schema?: Record<string, string>): Promise<void>;
}
```

**Features:**
- Auto-creates tables if not exists
- Batch inserts (1000 rows/batch)
- Schema inference or explicit schema

### 3. Transform Engine

**Purpose:** Apply business logic transformations

**Capabilities:**
- JavaScript/TypeScript transform functions
- Data enrichment
- Aggregation
- Filtering
- Reshaping/flattening

**Example:**
```typescript
export default async function transform(data: any[]): Promise<any[]> {
  return data.map(row => ({
    ...row,
    full_name: `${row.first_name} ${row.last_name}`,
    processed_at: new Date().toISOString()
  }));
}
```

### 4. Pipeline Executor

**Purpose:** Orchestrate ETL process

**Workflow:**
1. Load pipeline configuration
2. Create connector instances
3. Extract from source
4. Apply transform (if configured)
5. Load to target
6. Log results and statistics
7. Update run status

**Error Handling:**
- Automatic retry on transient failures
- Detailed error logging
- Pipeline run status tracking

### 5. Scheduler

**Purpose:** Automate pipeline execution

**Features:**
- Cron expression support
- Multiple concurrent pipelines
- Dynamic schedule updates
- Enable/disable pipelines

**Cron Examples:**
- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `*/15 * * * *` - Every 15 minutes

### 6. Control Database

**Purpose:** Store metadata and configuration

**Schema:**

```sql
-- Data sources (databases, APIs)
DataSource {
  id, name, type, configJson, createdAt, updatedAt
}

-- Data targets (warehouse tables)
DataTarget {
  id, name, type, configJson, createdAt, updatedAt
}

-- ETL pipelines
Pipeline {
  id, name, description, sourceId, targetId,
  transformScriptPath, scheduleCron, enabled,
  createdAt, updatedAt
}

-- Execution history
PipelineRun {
  id, pipelineId, startedAt, finishedAt,
  status, statsJson, logPath, errorMessage
}
```

### 7. REST API

**Endpoints:**

```
Sources:
  GET    /api/sources
  POST   /api/sources
  GET    /api/sources/:id
  PUT    /api/sources/:id
  DELETE /api/sources/:id

Targets:
  GET    /api/targets
  POST   /api/targets
  GET    /api/targets/:id
  PUT    /api/targets/:id
  DELETE /api/targets/:id

Pipelines:
  GET    /api/pipelines
  POST   /api/pipelines
  GET    /api/pipelines/:id
  PUT    /api/pipelines/:id
  DELETE /api/pipelines/:id
  POST   /api/pipelines/:id/execute

Runs:
  GET    /api/pipelines/:id/runs
  GET    /api/runs/:id
```

### 8. Web UI

**Pages:**
- `/` - Dashboard
- `/sources` - Manage data sources
- `/targets` - Manage data targets
- `/pipelines` - List all pipelines
- `/pipelines/[id]` - Pipeline detail & runs

**Features:**
- CRUD operations for all entities
- Manual pipeline execution
- Run history visualization
- Real-time status updates

## Data Flow

### Pipeline Execution Flow

```
1. Trigger (Manual/Scheduled)
         │
         ▼
2. Create PipelineRun (status: running)
         │
         ▼
3. Load Configuration
         │
         ├──► Source Config
         ├──► Target Config
         └──► Transform Script
         │
         ▼
4. Extract Phase
         │
         ├──► Connect to Source
         ├──► Execute Query/API Call
         ├──► Fetch Data
         └──► Disconnect
         │
         ▼
5. Transform Phase (Optional)
         │
         ├──► Load Transform Script
         ├──► Apply Transformation
         └──► Validate Output
         │
         ▼
6. Load Phase
         │
         ├──► Connect to Target
         ├──► Create Table (if needed)
         ├──► Insert Data (batched)
         └──► Disconnect
         │
         ▼
7. Complete
         │
         ├──► Save Logs
         ├──► Update Stats
         └──► Set Status (success/failed)
```

## Scalability Considerations

### Current Implementation
- **Concurrency:** Single-threaded execution
- **Data Size:** Best for < 100K rows per pipeline
- **Scheduling:** In-memory cron scheduler

### Future Enhancements
- **Queue System:** BullMQ for job queuing
- **Worker Pool:** Multiple worker processes
- **Incremental Loading:** Track last sync timestamp
- **Parallel Processing:** Process batches concurrently
- **Distributed Scheduler:** Redis-backed scheduling

## Security

### Current
- Environment variable configuration
- PostgreSQL connection encryption
- CORS enabled for UI

### Recommended for Production
- API authentication (JWT)
- Encrypted credentials storage
- Row-level security
- Audit logging
- Rate limiting
- Network isolation

## Monitoring

### Built-in
- Pipeline run status
- Execution logs
- Statistics (rows processed, duration)
- Error tracking

### Recommended Additions
- Prometheus metrics
- Grafana dashboards
- Alert manager
- Health checks
- Performance profiling

## Deployment Options

### Development
```bash
docker-compose up -d
npm run dev:backend
npm run dev:worker
npm run dev:ui
```

### Production

**Option 1: Docker**
```bash
docker build -t etl-orchestrator .
docker run -d etl-orchestrator
```

**Option 2: Kubernetes**
```yaml
deployments:
  - api-server
  - worker
  - ui
services:
  - postgresql
  - duckdb-volume
```

**Option 3: Serverless**
- API: AWS Lambda / Cloud Functions
- Scheduler: EventBridge / Cloud Scheduler
- Storage: RDS / Cloud SQL

## Extension Points

### Adding New Connectors

1. Implement connector interface
2. Add to connector factory
3. Update API validation schema
4. Add example configuration

### Custom Transforms

1. Create `.ts` file in transforms directory
2. Export default async function
3. Reference in pipeline config
4. Test with sample data

### UI Customization

1. Modify Next.js pages in `packages/ui/src/app`
2. Update Tailwind styles
3. Add new API endpoints as needed
4. Deploy UI independently

## Performance Optimization

### Database
- Index frequently queried fields
- Partition large tables
- Use connection pooling
- Optimize queries

### ETL
- Batch operations
- Incremental loading
- Parallel processing
- Data compression

### Caching
- Cache source metadata
- Reuse connections
- Cache transform results
- CDN for static assets
