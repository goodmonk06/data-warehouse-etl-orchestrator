# Quick Start Guide

Get your ETL orchestrator up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd data-warehouse-etl-orchestrator

# Install dependencies
npm install
```

## Step 2: Start Services

```bash
# Start PostgreSQL (control database) and example source DB
docker-compose up -d

# Wait for databases to be ready (about 10 seconds)
sleep 10
```

## Step 3: Initialize Database

```bash
# Run migrations to create schema
cd packages/backend
npm run generate
npm run migrate

# Seed example data
npm run seed
```

## Step 4: Start Applications

Open 3 terminal windows:

**Terminal 1 - Backend API:**
```bash
npm run dev:backend
```

**Terminal 2 - Worker (Scheduler):**
```bash
npm run dev:worker
```

**Terminal 3 - UI:**
```bash
npm run dev:ui
```

## Step 5: Access the UI

Open your browser to: http://localhost:3000

You should see:
- Welcome page with links to Sources, Targets, and Pipelines
- Pre-seeded example data (JSONPlaceholder API source and DuckDB target)

## Try Your First Pipeline

### Via UI

1. Go to **Pipelines** (http://localhost:3000/pipelines)
2. You'll see "Users API to Warehouse" pipeline
3. Click **Execute** to run it manually
4. Click on the pipeline name to see run details

### Via API

```bash
# List pipelines
curl http://localhost:3001/api/pipelines

# Execute a pipeline
curl -X POST http://localhost:3001/api/pipelines/<PIPELINE_ID>/execute

# Check run status
curl http://localhost:3001/api/pipelines/<PIPELINE_ID>/runs
```

## Create Your Own Pipeline

### 1. Create a Data Source

**PostgreSQL Example:**
```bash
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Source DB",
    "type": "postgres",
    "configJson": {
      "host": "localhost",
      "port": 5433,
      "database": "sourcedb",
      "user": "sourceuser",
      "password": "sourcepass",
      "query": "SELECT * FROM customers"
    }
  }'
```

**API Example:**
```bash
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub API",
    "type": "api",
    "configJson": {
      "url": "https://api.github.com/users",
      "method": "GET"
    }
  }'
```

### 2. Create a Data Target

```bash
curl -X POST http://localhost:3001/api/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Warehouse",
    "type": "duckdb",
    "configJson": {
      "dbPath": "./data/warehouse.duckdb",
      "tableName": "my_table"
    }
  }'
```

### 3. Create a Pipeline

```bash
curl -X POST http://localhost:3001/api/pipelines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My ETL Pipeline",
    "description": "Extract from source and load to warehouse",
    "sourceId": "<SOURCE_ID>",
    "targetId": "<TARGET_ID>",
    "scheduleCron": "0 */6 * * *",
    "enabled": true
  }'
```

## Testing the Example Source Database

The Docker setup includes a sample PostgreSQL database with customers, orders, and products.

```bash
# Connect to the example database
docker exec -it data-warehouse-etl-orchestrator-source_db-1 psql -U sourceuser -d sourcedb

# Query data
SELECT * FROM customers;
SELECT * FROM orders;
SELECT * FROM products;
```

Create a pipeline to sync this data:

```bash
# Create source for the example DB
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Orders DB",
    "type": "postgres",
    "configJson": {
      "host": "localhost",
      "port": 5433,
      "database": "sourcedb",
      "user": "sourceuser",
      "password": "sourcepass",
      "query": "SELECT o.id, o.customer_id, o.order_date, o.total_amount, o.status, c.email, c.first_name, c.last_name FROM orders o JOIN customers c ON o.customer_id = c.id"
    }
  }'
```

## Query Your Warehouse

After running pipelines, query your DuckDB warehouse:

```bash
# Install DuckDB CLI
# macOS: brew install duckdb
# Linux: Download from https://duckdb.org/

# Query the warehouse
duckdb data/warehouse.duckdb

# Inside DuckDB:
SHOW TABLES;
SELECT * FROM users LIMIT 10;
SELECT COUNT(*) FROM users;
```

## Troubleshooting

### "Connection refused" errors
- Ensure Docker containers are running: `docker-compose ps`
- Check if ports 3000, 3001, 5432, 5433 are not in use

### "Database not found" errors
- Run migrations: `cd packages/backend && npm run migrate`

### "Module not found" errors
- Install dependencies: `npm install`
- Regenerate Prisma client: `cd packages/backend && npm run generate`

### Worker not picking up scheduled pipelines
- Ensure worker is running: `npm run dev:worker`
- Check `ENABLE_SCHEDULER=true` in packages/backend/.env
- Verify cron expression is valid

## Next Steps

1. Read the [README.md](./README.md) for detailed documentation
2. Explore example transforms in `examples/transforms/`
3. Create custom transform scripts for your data
4. Set up real data sources (your databases, CRM, analytics tools)
5. Configure scheduled pipelines for automated syncs

## Common Use Cases

### Daily Sales Report
```javascript
// Schedule: 0 2 * * * (Daily at 2 AM)
// Source: Your e-commerce database
// Query: SELECT * FROM orders WHERE DATE(created_at) = CURRENT_DATE - 1
// Target: analytics_daily_orders
```

### Hourly Customer Sync
```javascript
// Schedule: 0 * * * * (Every hour)
// Source: CRM API (HubSpot, Salesforce)
// Transform: Normalize fields, enrich data
// Target: warehouse_customers
```

### Real-time Support Metrics
```javascript
// Schedule: */15 * * * * (Every 15 minutes)
// Source: Zendesk API
// Transform: Calculate resolution times, categorize tickets
// Target: support_metrics
```

Happy ETL orchestrating! 🚀
