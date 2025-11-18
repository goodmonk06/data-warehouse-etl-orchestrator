# Data Warehouse ETL Orchestrator

> A comprehensive ETL (Extract, Transform, Load) orchestration platform for centralizing data from various application databases and APIs into a unified data warehouse for BI and analytics.

## Overview

This production-ready ETL orchestrator enables you to:
- **Extract** data from multiple sources (PostgreSQL databases, HTTP APIs, CSV files)
- **Transform** data using reusable templates or custom JavaScript/TypeScript functions
- **Load** data into your data warehouse (DuckDB, PostgreSQL, BigQuery)
- **Schedule** automated pipeline executions with cron expressions
- **Monitor** pipeline runs, logs, and statistics via REST API and web UI
- **Validate** data quality with automated rules and scoring
- **Test** connections with health checks and diagnostics
- **Extend** functionality with pluggable adapters for notifications, metrics, and storage

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Fastify (TypeScript)
- **ORM**: Prisma
- **Control Database**: PostgreSQL
- **Warehouse**: DuckDB (extensible to PostgreSQL/BigQuery)
- **Scheduler**: node-cron
- **Validation**: Zod
- **Testing**: Vitest
- **Linting**: ESLint + TypeScript ESLint

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API Client**: Type-safe REST client

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Development**: Hot-reload with tsx/Next.js dev server

## Domain Model Summary

### Core Entities

```
DataSource                TransformTemplate
  ↓ 1:N                      ↓ 1:N
Pipeline ←------------------- (optional)
  ↓ 1:N
PipelineRun → DataQualityResult
              DataTarget

ConnectionTest → DataSource / DataTarget
DataQualityRule → Pipeline
```

### Phase 3 Enhancements

The orchestrator now includes **12 entities** (up from 4):

**Core Workflow:**
- `DataSource` - Source system configurations with tags, metadata, health tracking
- `DataTarget` - Target system configurations with similar enhancements
- `Pipeline` - ETL workflows with priorities, retries, timeouts, dependencies
- `PipelineRun` - Execution history with quality scores and detailed metrics

**Transform Templates:**
- `TransformTemplate` - Reusable transform logic with versioning (7 pre-built templates included)

**Data Quality:**
- `DataQualityRule` - Validation rules (completeness, uniqueness, range, schema, custom)
- `DataQualityResult` - Quality check results with scores and violations

**Connection Testing:**
- `ConnectionTest` - Connection health checks with response times and diagnostics

**Notifications:**
- `NotificationConfig` - Alert configurations (email, Slack, webhook, SMS)
- `NotificationLog` - Notification tracking and audit trail

**Orchestration:**
- `PipelineScheduleHistory` - Schedule execution audit trail
- `PipelineDependency` - DAG support for complex workflows

### Key Features

- **Extensibility**: Adapter interfaces for notifications, metrics, and storage
- **Observability**: Structured logging with context and metrics collection
- **Quality**: Automated data quality validation with severity levels
- **Health**: Connection testing with historical tracking
- **Reusability**: Transform template library with versioning and cloning

## Getting Started

### Requirements

- Node.js >= 18.0.0
- Docker & Docker Compose
- npm (comes with Node.js)

### Setup Steps

#### 1. Clone and Install

```bash
git clone <repository-url>
cd data-warehouse-etl-orchestrator
npm install
```

#### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your configuration (defaults work for local development):

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/etl_orchestrator?schema=public"
WAREHOUSE_TYPE="duckdb"
DUCKDB_PATH="./data/warehouse.duckdb"
API_PORT=3001
API_HOST="0.0.0.0"
NEXT_PUBLIC_API_URL="http://localhost:3001"
ENABLE_SCHEDULER=true
```

#### 3. Start Services

**Option A: Local Development (Recommended)**

```bash
# Start only databases
npm run docker:dev

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Start all services (API + Worker + UI)
npm run dev
```

**Option B: Individual Services**

```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Worker (Scheduler)
npm run dev:worker

# Terminal 3: UI
npm run dev:ui
```

**Option C: Full Docker Stack**

```bash
# Build and start all containers
npm run docker:up

# Run migrations inside container
docker exec -it <api-container> npm run db:migrate

# Seed data
docker exec -it <api-container> npm run db:seed
```

#### 4. Verify Installation

```bash
# Check API health
curl http://localhost:3001/health

# Open UI in browser
open http://localhost:3000
```

## Example Flow: Complete Vertical Slice

Here's a complete end-to-end example demonstrating the full ETL workflow using pre-seeded data.

### 1. View Available Pipelines

**Via UI:**
Navigate to http://localhost:3000/pipelines

**Via API:**
```bash
curl http://localhost:3001/api/pipelines
```

You'll see the example pipeline: **"Users API to Warehouse"**

### 2. Inspect Pipeline Configuration

```bash
curl http://localhost:3001/api/pipelines/<PIPELINE_ID>
```

This pipeline demonstrates:
- **Source**: JSONPlaceholder API (public test API)
- **Target**: DuckDB warehouse table `users`
- **Schedule**: Every 6 hours (disabled by default for manual testing)
- **Transform**: None (direct extract-load)

### 3. Execute Pipeline

**Via UI:**
Click the "Execute" button next to the pipeline

**Via API:**
```bash
curl -X POST http://localhost:3001/api/pipelines/<PIPELINE_ID>/execute
```

Response:
```json
{
  "runId": "uuid-here",
  "message": "Pipeline execution started"
}
```

### 4. Monitor Execution

**Via UI:**
Click on the pipeline name to view run history and details

**Via API:**
```bash
# Get all runs for this pipeline
curl http://localhost:3001/api/pipelines/<PIPELINE_ID>/runs

# Get specific run details
curl http://localhost:3001/api/runs/<RUN_ID>
```

Example run result:
```json
{
  "id": "run-id",
  "pipelineId": "pipeline-id",
  "status": "success",
  "startedAt": "2024-01-01T10:00:00Z",
  "finishedAt": "2024-01-01T10:00:05Z",
  "statsJson": {
    "extractedRows": 10,
    "transformedRows": 10,
    "loadedRows": 10
  },
  "logPath": "logs/pipeline-xxx-xxx.log"
}
```

### 5. Query Warehouse Data

```bash
# Install DuckDB CLI if not already installed
# macOS: brew install duckdb
# Linux: https://duckdb.org/docs/installation/

# Query the data
duckdb data/warehouse.duckdb

# In DuckDB shell:
SELECT * FROM users LIMIT 5;
SELECT COUNT(*) as total_users FROM users;
```

This complete workflow demonstrates:
- ✅ API extraction
- ✅ Data loading to warehouse
- ✅ Run tracking and logging
- ✅ UI and API interaction

## Common Development Tasks

### Database Operations

```bash
# Generate Prisma client (run after schema changes)
npm run db:generate

# Create and apply migration
npm run db:migrate

# Push schema without migration (development only)
npm run db:push

# Seed database with example data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Type check without building
npm run type-check
```

### Building and Running

```bash
# Build all packages
npm run build

# Start production servers
npm run start
```

### Docker Operations

```bash
# Start all services (full stack)
npm run docker:up

# Start only databases (dev mode)
npm run docker:dev

# Stop all services
npm run docker:down

# View container logs
npm run docker:logs
```

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

### Quick Reference

**Data Sources & Targets:**
- `GET /api/sources` - List all sources
- `POST /api/sources` - Create a new source
- `GET /api/sources/:id` - Get source details
- `PUT /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source
- `POST /api/sources/:id/test` - **Test source connection**
- `GET /api/sources/:id/test-history` - **Get test history**

*(Similar endpoints available for `/api/targets`)*

**Transform Templates (NEW):**
- `GET /api/transform-templates` - List templates with filtering
- `POST /api/transform-templates` - Create template
- `GET /api/transform-templates/:id` - Get template details
- `PUT /api/transform-templates/:id` - Update template
- `DELETE /api/transform-templates/:id` - Delete template
- `POST /api/transform-templates/:id/clone` - Clone template with new version
- `POST /api/transform-templates/validate` - Validate template code

**Connection Testing (NEW):**
- `POST /api/sources/:id/test` - Test source connection
- `POST /api/targets/:id/test` - Test target connection
- `GET /api/connection-tests` - List recent tests
- `GET /api/connection-health` - Get health summary

**Data Quality Rules (NEW):**
- `POST /api/data-quality-rules` - Create quality rule
- `GET /api/pipelines/:pipelineId/data-quality-rules` - List rules for pipeline
- `GET /api/data-quality-rules/:id` - Get rule details
- `PUT /api/data-quality-rules/:id` - Update rule
- `DELETE /api/data-quality-rules/:id` - Delete rule
- `GET /api/runs/:runId/data-quality-results` - Get quality results for run

**Pipelines:**
- `GET /api/pipelines` - List all pipelines
- `POST /api/pipelines` - Create a new pipeline
- `GET /api/pipelines/:id` - Get pipeline details
- `PUT /api/pipelines/:id` - Update pipeline
- `DELETE /api/pipelines/:id` - Delete pipeline
- `POST /api/pipelines/:id/execute` - Execute pipeline manually
- `GET /api/pipelines/:id/runs` - Get pipeline run history

**Pipeline Runs:**
- `GET /api/runs/:id` - Get run details

### Complete API Documentation

For comprehensive API documentation including request/response schemas, error handling, and examples, see:

📘 **[Complete API Reference](./docs/API_REFERENCE.md)**

📋 **[Integration Recipes & Examples](./docs/INTEGRATION_RECIPES.md)**

📊 **[Phase 3 Overview & Architecture](./docs/PHASE3_OVERVIEW.md)**

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

## Phase 3 Completed Features ✅

The following features have been implemented in Phase 3:

### Transform Templates
- [x] Reusable transform template library
- [x] Template versioning and cloning
- [x] 7 pre-built templates (cleaning, enrichment, aggregation, validation)
- [x] Code validation endpoint
- [x] Template categorization and tagging

### Data Quality & Validation
- [x] Schema validation rules
- [x] Data quality checks (completeness, uniqueness, range checks)
- [x] Custom quality rules with code
- [x] Quality scoring and violation tracking
- [x] Severity levels (critical, warning, info)

### Connection Testing & Health
- [x] Connection testing for sources and targets
- [x] Health check dashboard with summary metrics
- [x] Test history tracking
- [x] Response time monitoring
- [x] Detailed diagnostics

### Advanced Features
- [x] Retry policies and backoff strategies
- [x] Pipeline priorities and timeouts
- [x] Pipeline dependencies (schema support)
- [x] Enhanced metadata and tagging

### Monitoring & Observability
- [x] Structured logging with context
- [x] Metrics collection (counters, gauges, histograms)
- [x] Request ID tracking
- [x] Child loggers with inheritance

### Extensibility
- [x] Notification adapter interface (email, Slack, webhook, SMS)
- [x] Metrics adapter interface (Prometheus-compatible)
- [x] Storage adapter interface (S3, Azure, GCS)
- [x] Adapter registry for runtime configuration
- [x] In-memory adapters for testing

### Developer Experience
- [x] Comprehensive API documentation
- [x] Integration recipes and examples
- [x] Rich seed data with personas
- [x] Comprehensive test suite
- [x] Centralized error handling

## Future Extensions

The following features are planned for future releases:

### Connectors
- [ ] MySQL source connector
- [ ] MongoDB source connector
- [ ] Amazon S3 source/target connector (interface exists, needs implementation)
- [ ] Snowflake target connector
- [ ] Google BigQuery target connector (full implementation)
- [ ] Apache Kafka source connector

### Data Quality
- [ ] Anomaly detection
- [ ] Data profiling
- [ ] Auto-generated quality rules from data profiling
- [ ] Quality trend analysis

### Advanced Features
- [ ] Incremental loading strategies (CDC, timestamps)
- [ ] DAG execution engine (schema exists, needs runtime)
- [ ] Parallel pipeline execution
- [ ] Pipeline versioning

### Monitoring & Observability
- [ ] Prometheus metrics export (adapter ready)
- [ ] Grafana dashboard templates
- [ ] Alert manager integration (notification adapter ready)
- [ ] Active notification dispatching
- [ ] Distributed tracing

### Enterprise Features
- [ ] Multi-tenant support
- [ ] Authentication & authorization (JWT, OAuth)
- [ ] Role-based access control (RBAC)
- [ ] Audit logs (schema ready)
- [ ] Data lineage visualization
- [ ] Cost tracking and optimization

### Developer Experience
- [ ] Web-based transform editor
- [ ] CLI tool for pipeline management
- [ ] Pipeline testing framework
- [ ] CI/CD integration examples
- [ ] Terraform/Kubernetes deployment templates
