# Data Warehouse ETL Orchestrator

A comprehensive ETL (Extract, Transform, Load) orchestration platform for centralizing data from various application databases and APIs into a unified data warehouse for BI and analytics.

## Features

- **Multiple Source Connectors**: PostgreSQL, HTTP JSON APIs, CSV (extensible)
- **Warehouse Targets**: DuckDB, PostgreSQL, BigQuery support
- **Transform Engine**: Apply custom JavaScript/TypeScript transformations
- **Scheduling**: Cron-based automated pipeline execution
- **Pipeline Management**: REST API and web UI for configuration
- **Run History**: Track execution status, logs, and statistics
- **Data Lineage**: Understand data flow from sources to targets

## Architecture

```
┌─────────────────┐
│   Data Sources  │
│  - PostgreSQL   │
│  - APIs         │
│  - CSV Files    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ETL Engine    │
│  - Extract      │
│  - Transform    │
│  - Load         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Warehouse │
│  - DuckDB       │
│  - PostgreSQL   │
└─────────────────┘
```

## Tech Stack

- **Backend**: Fastify + TypeScript
- **Control DB**: Prisma + PostgreSQL
- **Warehouse**: DuckDB (or PostgreSQL/BigQuery)
- **Scheduler**: node-cron
- **UI**: Next.js + React + Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd data-warehouse-etl-orchestrator
```

2. Install dependencies:
```bash
npm install
```

3. Start required services (PostgreSQL):
```bash
docker-compose up -d
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Initialize the database:
```bash
npm run migrate
npm run seed
```

6. Start the development servers:
```bash
# Terminal 1: Start backend API
npm run dev:backend

# Terminal 2: Start worker (scheduler)
npm run dev:worker

# Terminal 3: Start UI
npm run dev:ui
```

7. Access the application:
- UI: http://localhost:3000
- API: http://localhost:3001

## Usage Examples

### Example 1: E-commerce Marketplace to Warehouse

Extract product and order data from your marketplace database and load into a warehouse for analytics.

**1. Create a Data Source (PostgreSQL - Marketplace DB)**

```json
{
  "name": "Marketplace Database",
  "type": "postgres",
  "configJson": {
    "host": "marketplace-db.example.com",
    "port": 5432,
    "database": "marketplace",
    "user": "readonly_user",
    "password": "secure_password",
    "query": "SELECT * FROM orders WHERE updated_at > NOW() - INTERVAL '24 hours'"
  }
}
```

**2. Create a Data Target (DuckDB Warehouse)**

```json
{
  "name": "Analytics Warehouse",
  "type": "duckdb",
  "configJson": {
    "dbPath": "./data/warehouse.duckdb",
    "tableName": "marketplace_orders"
  }
}
```

**3. Create a Pipeline**

```json
{
  "name": "Daily Orders Sync",
  "description": "Sync marketplace orders to warehouse",
  "sourceId": "<source-id>",
  "targetId": "<target-id>",
  "scheduleCron": "0 2 * * *",
  "enabled": true
}
```

### Example 2: CRM API to Warehouse

Extract customer data from your CRM API (e.g., Salesforce, HubSpot) and centralize it.

**1. Create an API Source**

```json
{
  "name": "HubSpot CRM",
  "type": "api",
  "configJson": {
    "url": "https://api.hubapi.com/crm/v3/objects/contacts",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer YOUR_API_KEY"
    },
    "dataPath": "results"
  }
}
```

**2. Create a Pipeline with Transform**

Create a transform script at `examples/transforms/crm-normalize.ts`:

```typescript
export default async function transform(data: any[]): Promise<any[]> {
  return data.map(contact => ({
    customer_id: contact.id,
    email: contact.properties.email,
    first_name: contact.properties.firstname,
    last_name: contact.properties.lastname,
    company: contact.properties.company,
    lifecycle_stage: contact.properties.lifecyclestage,
    created_at: contact.properties.createdate,
    synced_at: new Date().toISOString()
  }));
}
```

Pipeline configuration:
```json
{
  "name": "CRM Contacts Sync",
  "description": "Extract and normalize CRM contacts",
  "sourceId": "<api-source-id>",
  "targetId": "<warehouse-target-id>",
  "transformScriptPath": "examples/transforms/crm-normalize.ts",
  "scheduleCron": "0 */6 * * *",
  "enabled": true
}
```

### Example 3: Helpdesk (Zendesk) to Warehouse

Extract support ticket data from Zendesk API for customer service analytics.

**1. Create Zendesk API Source**

```json
{
  "name": "Zendesk Support",
  "type": "api",
  "configJson": {
    "url": "https://your-domain.zendesk.com/api/v2/tickets.json",
    "method": "GET",
    "headers": {
      "Authorization": "Basic YOUR_ENCODED_CREDENTIALS"
    },
    "dataPath": "tickets"
  }
}
```

**2. Create Transform for Ticket Enrichment**

Create `examples/transforms/ticket-enrichment.ts`:

```typescript
export default async function transform(data: any[]): Promise<any[]> {
  return data.map(ticket => ({
    ticket_id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    requester_id: ticket.requester_id,
    assignee_id: ticket.assignee_id,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    resolved_at: ticket.status === 'solved' ? ticket.updated_at : null,
    // Calculate resolution time if solved
    resolution_hours: ticket.status === 'solved'
      ? Math.round((new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60))
      : null,
    tags: ticket.tags?.join(','),
    synced_at: new Date().toISOString()
  }));
}
```

**3. Create Pipeline**

```json
{
  "name": "Support Tickets Sync",
  "description": "Sync Zendesk tickets with enrichment",
  "sourceId": "<zendesk-source-id>",
  "targetId": "<warehouse-target-id>",
  "transformScriptPath": "examples/transforms/ticket-enrichment.ts",
  "scheduleCron": "0 */4 * * *",
  "enabled": true
}
```

## API Reference

### Data Sources

- `GET /api/sources` - List all sources
- `POST /api/sources` - Create a new source
- `GET /api/sources/:id` - Get source details
- `PUT /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source

### Data Targets

- `GET /api/targets` - List all targets
- `POST /api/targets` - Create a new target
- `GET /api/targets/:id` - Get target details
- `PUT /api/targets/:id` - Update target
- `DELETE /api/targets/:id` - Delete target

### Pipelines

- `GET /api/pipelines` - List all pipelines
- `POST /api/pipelines` - Create a new pipeline
- `GET /api/pipelines/:id` - Get pipeline details
- `PUT /api/pipelines/:id` - Update pipeline
- `DELETE /api/pipelines/:id` - Delete pipeline
- `POST /api/pipelines/:id/execute` - Execute pipeline manually

### Pipeline Runs

- `GET /api/pipelines/:id/runs` - Get pipeline run history
- `GET /api/runs/:id` - Get run details

## Transform Scripts

Transform scripts are TypeScript/JavaScript modules that process data between extraction and loading.

### Transform Function Signature

```typescript
export default async function transform(data: any[]): Promise<any[]> {
  // Your transformation logic
  return transformedData;
}
```

### Example Transforms

See the `examples/transforms/` directory for examples:

- `customer-enrichment.ts` - Add computed fields to customer data
- `order-aggregation.ts` - Aggregate orders by customer
- `api-data-flatten.ts` - Flatten nested API responses

## Scheduling

Pipelines support cron-based scheduling. Common patterns:

- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight
- `*/15 * * * *` - Every 15 minutes

## Production Deployment

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/etl_orchestrator"

# Warehouse
WAREHOUSE_TYPE="duckdb"
DUCKDB_PATH="/data/warehouse.duckdb"

# API
API_PORT=3001
API_HOST="0.0.0.0"

# UI
NEXT_PUBLIC_API_URL="https://api.your-domain.com"

# Worker
ENABLE_SCHEDULER=true
```

### Running in Production

1. Build the applications:
```bash
npm run build
```

2. Run database migrations:
```bash
npm run migrate:deploy
```

3. Start services:
```bash
# API Server
npm run start --workspace=packages/backend

# Worker (Scheduler)
npm run start:worker --workspace=packages/backend

# UI (or use a static export)
npm run start --workspace=packages/ui
```

### Docker Deployment

Build and deploy using Docker:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Development

### Project Structure

```
.
├── packages/
│   ├── backend/          # Fastify API & ETL engine
│   │   ├── src/
│   │   │   ├── connectors/   # Source & target connectors
│   │   │   ├── engine/       # Pipeline executor
│   │   │   ├── scheduler/    # Cron scheduler
│   │   │   ├── api/          # REST API routes
│   │   │   └── prisma/       # Database schema
│   │   └── package.json
│   └── ui/               # Next.js frontend
│       ├── src/
│       │   ├── app/          # Pages & layouts
│       │   ├── components/   # React components
│       │   └── lib/          # Utilities & API client
│       └── package.json
├── examples/
│   ├── transforms/       # Example transform scripts
│   └── source-db-init.sql  # Sample source database
├── docker-compose.yml
└── package.json
```

### Adding New Connectors

1. Implement the connector interface:
```typescript
export interface SourceConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  extract(): Promise<any[]>;
}
```

2. Add connector to `packages/backend/src/connectors/`
3. Register in the executor's `createSourceConnector` method

## Monitoring & Observability

- **Pipeline Runs**: View execution history in the UI
- **Logs**: Each run creates a log file at `logs/pipeline-{id}-{run-id}.log`
- **Stats**: Track rows processed, execution time, success/failure rates
- **Health Check**: `GET /health` endpoint for monitoring

## Troubleshooting

### Pipeline Execution Fails

1. Check the run logs in the UI or log files
2. Verify source connection credentials
3. Test the source query/API endpoint independently
4. Ensure transform script has no syntax errors

### Scheduler Not Running Pipelines

1. Verify `ENABLE_SCHEDULER=true` in environment
2. Check worker process is running
3. Ensure pipeline is enabled and has valid cron expression
4. Check worker logs for errors

### Database Connection Issues

1. Verify PostgreSQL is running: `docker-compose ps`
2. Check DATABASE_URL in .env
3. Run migrations: `npm run migrate`

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review example configurations

## Roadmap

Future enhancements:

- [ ] More connectors (MySQL, MongoDB, S3, Snowflake)
- [ ] Data quality checks and validation
- [ ] Incremental loading strategies
- [ ] Pipeline dependencies and DAGs
- [ ] Advanced monitoring and alerting
- [ ] Data lineage visualization
- [ ] Multi-tenant support
- [ ] Authentication & authorization
