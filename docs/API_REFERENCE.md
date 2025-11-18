# API Reference

Complete API reference for the Data Warehouse ETL Orchestrator.

## Base URL

```
http://localhost:3000
```

## Table of Contents

1. [Health Check](#health-check)
2. [Data Sources](#data-sources)
3. [Data Targets](#data-targets)
4. [Transform Templates](#transform-templates)
5. [Connection Testing](#connection-testing)
6. [Data Quality Rules](#data-quality-rules)
7. [Pipelines](#pipelines)
8. [Pipeline Runs](#pipeline-runs)

---

## Health Check

### GET /health

Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Data Sources

### GET /api/sources

List all data sources.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "E-commerce Orders DB",
    "type": "postgres",
    "description": "Production PostgreSQL database",
    "configJson": { "host": "...", "port": 5432 },
    "tags": ["production", "orders"],
    "isActive": true,
    "lastTestedAt": "2024-01-15T10:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### GET /api/sources/:id

Get a single data source by ID.

**Parameters:**
- `id` (path): Source UUID

**Response:**
```json
{
  "id": "uuid",
  "name": "E-commerce Orders DB",
  "type": "postgres",
  "description": "Production PostgreSQL database",
  "configJson": { "host": "..." },
  "pipelines": [
    { "id": "uuid", "name": "Orders ETL Pipeline" }
  ]
}
```

### POST /api/sources

Create a new data source.

**Request Body:**
```json
{
  "name": "Customer Data API",
  "type": "api",
  "description": "REST API for customer data",
  "configJson": {
    "url": "https://api.example.com/customers",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer token123"
    }
  },
  "tags": ["api", "customers"],
  "isActive": true
}
```

**Supported Types:**
- `postgres`: PostgreSQL database
- `api`: REST API endpoint
- `csv`: CSV file

**Response:** Created source object

### PUT /api/sources/:id

Update a data source.

**Parameters:**
- `id` (path): Source UUID

**Request Body:** Partial source object (any fields to update)

**Response:** Updated source object

### DELETE /api/sources/:id

Delete a data source.

**Parameters:**
- `id` (path): Source UUID

**Response:**
```json
{
  "success": true
}
```

---

## Data Targets

### GET /api/targets

List all data targets.

### GET /api/targets/:id

Get a single data target by ID.

### POST /api/targets

Create a new data target.

**Request Body:**
```json
{
  "name": "Analytics Warehouse",
  "type": "duckdb",
  "description": "Local analytical database",
  "configJson": {
    "path": "./data/warehouse.duckdb",
    "schema": "analytics"
  },
  "tags": ["analytics"],
  "isActive": true
}
```

**Supported Types:**
- `duckdb`: DuckDB analytical database
- `postgres`: PostgreSQL database
- `bigquery`: Google BigQuery

### PUT /api/targets/:id

Update a data target.

### DELETE /api/targets/:id

Delete a data target.

---

## Transform Templates

### GET /api/transform-templates

List all transform templates with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category (cleaning, enrichment, aggregation, validation, custom)
- `isActive` (optional): Filter by active status (true/false)
- `tags` (optional): Comma-separated tags to filter by

**Example:**
```
GET /api/transform-templates?category=cleaning&isActive=true
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Remove Null Values",
    "description": "Filters out rows with null values",
    "category": "cleaning",
    "version": "1.0.0",
    "code": "return data.filter(row => ...);",
    "parameters": { "fields": ["id", "name"] },
    "tags": ["cleaning", "nulls"],
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "_count": {
      "pipelines": 3
    }
  }
]
```

### GET /api/transform-templates/:id

Get a single transform template by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "Remove Null Values",
  "description": "Filters out rows with null values",
  "category": "cleaning",
  "version": "1.0.0",
  "code": "return data.filter(row => ...);",
  "parameters": { "fields": ["id", "name"] },
  "tags": ["cleaning", "nulls"],
  "isActive": true,
  "pipelines": [
    {
      "id": "uuid",
      "name": "Orders ETL Pipeline",
      "isActive": true
    }
  ]
}
```

### POST /api/transform-templates

Create a new transform template.

**Request Body:**
```json
{
  "name": "Custom Cleaning Transform",
  "description": "Removes invalid email addresses",
  "category": "cleaning",
  "version": "1.0.0",
  "code": "const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\nreturn data.filter(row => emailRegex.test(row.email));",
  "parameters": {},
  "tags": ["cleaning", "email"],
  "isActive": true
}
```

**Validation:**
- `name`: Required, must be unique
- `category`: Must be one of: cleaning, enrichment, aggregation, validation, custom
- `code`: Required, must be valid JavaScript with return statement

**Response:** Created template object

### PUT /api/transform-templates/:id

Update a transform template.

**Request Body:** Partial template object

### DELETE /api/transform-templates/:id

Delete a transform template.

**Error:** Returns 400 if template is currently in use by pipelines

### POST /api/transform-templates/:id/clone

Clone an existing template with optional new name and version.

**Request Body:**
```json
{
  "name": "My Custom Version",
  "version": "2.0.0"
}
```

**Response:** Newly created cloned template

### POST /api/transform-templates/validate

Validate transform template code without saving.

**Request Body:**
```json
{
  "code": "return data.map(row => ({ ...row, processed: true }));"
}
```

**Response:**
```json
{
  "valid": true
}
```

Or if invalid:
```json
{
  "valid": false,
  "errors": [
    "Syntax error: Unexpected token",
    "Template code must include a return statement"
  ]
}
```

---

## Connection Testing

### POST /api/sources/:id/test

Test a data source connection.

**Parameters:**
- `id` (path): Source UUID

**Response:**
```json
{
  "id": "test-uuid",
  "sourceId": "uuid",
  "status": "success",
  "responseTimeMs": 234,
  "message": "Successfully connected to PostgreSQL database",
  "testedAt": "2024-01-15T10:30:00.000Z",
  "details": {
    "version": "OK"
  }
}
```

### POST /api/targets/:id/test

Test a data target connection.

**Parameters:**
- `id` (path): Target UUID

**Response:** Same format as source test

### GET /api/sources/:id/test-history

Get test history for a source.

**Parameters:**
- `id` (path): Source UUID
- `limit` (query, optional): Number of tests to return (default: 10)

**Response:** Array of connection test objects

### GET /api/targets/:id/test-history

Get test history for a target.

### GET /api/connection-tests

Get recent connection tests across all sources and targets.

**Parameters:**
- `limit` (query, optional): Number of tests to return (default: 20)

**Response:**
```json
[
  {
    "id": "test-uuid",
    "sourceId": "uuid",
    "targetId": null,
    "status": "success",
    "responseTimeMs": 234,
    "message": "Successfully connected",
    "testedAt": "2024-01-15T10:30:00.000Z",
    "source": {
      "id": "uuid",
      "name": "Orders DB",
      "type": "postgres"
    }
  }
]
```

### GET /api/connection-health

Get connection health summary.

**Response:**
```json
{
  "sources": {
    "total": 5,
    "healthy": 4,
    "unhealthy": 1
  },
  "targets": {
    "total": 3,
    "healthy": 3,
    "unhealthy": 0
  },
  "recentTests": {
    "total": 15,
    "passed": 14,
    "failed": 1
  }
}
```

---

## Data Quality Rules

### POST /api/data-quality-rules

Create a new data quality rule.

**Request Body:**
```json
{
  "pipelineId": "uuid",
  "name": "Email Format Validation",
  "description": "Validates email addresses follow correct format",
  "ruleType": "schema",
  "config": {
    "field": "email",
    "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
  },
  "severity": "warning",
  "isActive": true
}
```

**Rule Types:**

1. **completeness** - Check required fields are not null
```json
{
  "ruleType": "completeness",
  "config": {
    "fields": ["order_id", "customer_id", "total_amount"],
    "threshold": 0.99
  }
}
```

2. **uniqueness** - Ensure field values are unique
```json
{
  "ruleType": "uniqueness",
  "config": {
    "field": "order_id"
  }
}
```

3. **range** - Validate numeric values within range
```json
{
  "ruleType": "range",
  "config": {
    "field": "age",
    "min": 0,
    "max": 120
  }
}
```

4. **schema** - Validate field matches pattern/format
```json
{
  "ruleType": "schema",
  "config": {
    "field": "email",
    "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
  }
}
```

5. **custom** - Custom validation code
```json
{
  "ruleType": "custom",
  "config": {
    "code": "return { passed: data.length > 0, score: 100, violations: 0, message: 'OK' };"
  }
}
```

**Severity Levels:**
- `critical`: Pipeline fails if rule fails
- `warning`: Pipeline continues with warning
- `info`: Informational only

**Response:** Created rule object

### GET /api/pipelines/:pipelineId/data-quality-rules

Get all quality rules for a pipeline.

### GET /api/data-quality-rules/:id

Get a single quality rule by ID.

**Response:**
```json
{
  "id": "uuid",
  "pipelineId": "uuid",
  "name": "Email Format Validation",
  "description": "Validates email addresses",
  "ruleType": "schema",
  "config": { "field": "email", "pattern": "..." },
  "severity": "warning",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "pipeline": {
    "id": "uuid",
    "name": "Customer Sync Pipeline"
  },
  "results": [
    {
      "id": "result-uuid",
      "passed": true,
      "score": 98.5,
      "violations": 3,
      "message": "Schema validation passed",
      "checkedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

### PUT /api/data-quality-rules/:id

Update a quality rule.

### DELETE /api/data-quality-rules/:id

Delete a quality rule.

### GET /api/runs/:runId/data-quality-results

Get quality check results for a specific pipeline run.

**Response:**
```json
[
  {
    "id": "result-uuid",
    "ruleId": "uuid",
    "runId": "uuid",
    "passed": true,
    "score": 98.5,
    "violations": 3,
    "message": "Completeness check passed (98.50%)",
    "checkedAt": "2024-01-15T10:00:00.000Z",
    "details": {
      "totalRows": 1000,
      "fields": ["order_id", "customer_id"],
      "violationCount": 15
    },
    "rule": {
      "id": "uuid",
      "name": "Required Fields Completeness",
      "ruleType": "completeness",
      "severity": "critical"
    }
  }
]
```

---

## Pipelines

### GET /api/pipelines

List all pipelines.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Orders ETL Pipeline",
    "description": "Extract orders, clean and load to warehouse",
    "sourceId": "uuid",
    "targetId": "uuid",
    "transformTemplateId": "uuid",
    "scheduleCron": "0 2 * * *",
    "enabled": true,
    "tags": ["orders", "critical"],
    "priority": 8,
    "timeoutSeconds": 3600,
    "retryPolicy": { "maxRetries": 3, "backoffMs": 5000 },
    "createdBy": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "source": { "id": "uuid", "name": "Orders DB", "type": "postgres" },
    "target": { "id": "uuid", "name": "Warehouse", "type": "duckdb" },
    "_count": { "runs": 150 }
  }
]
```

### GET /api/pipelines/:id

Get a single pipeline by ID.

**Response:** Pipeline object with source, target, and recent runs

### POST /api/pipelines

Create a new pipeline.

**Request Body:**
```json
{
  "name": "New ETL Pipeline",
  "description": "Pipeline description",
  "sourceId": "uuid",
  "targetId": "uuid",
  "transformTemplateId": "uuid",
  "transformScriptPath": "/transforms/custom.js",
  "scheduleCron": "0 */4 * * *",
  "enabled": true,
  "tags": ["new", "experimental"],
  "priority": 5,
  "timeoutSeconds": 1800,
  "retryPolicy": {
    "maxRetries": 3,
    "backoffMs": 5000
  },
  "metadata": {
    "owner": "data-team",
    "project": "analytics"
  },
  "createdBy": "admin"
}
```

**Fields:**
- `transformTemplateId` OR `transformScriptPath`: One must be provided
- `scheduleCron`: Standard cron expression
- `priority`: 1-10 (higher = more important)

### PUT /api/pipelines/:id

Update a pipeline.

### DELETE /api/pipelines/:id

Delete a pipeline.

---

## Pipeline Runs

### GET /api/pipelines/:id/runs

Get all runs for a pipeline.

**Response:**
```json
[
  {
    "id": "run-uuid",
    "pipelineId": "uuid",
    "status": "completed",
    "startedAt": "2024-01-15T02:00:00.000Z",
    "completedAt": "2024-01-15T02:15:32.000Z",
    "rowsProcessed": 15847,
    "errorMessage": null,
    "triggeredBy": "scheduler",
    "retryCount": 0,
    "executionTimeMs": 932000,
    "dataQualityScore": 98.5,
    "metadata": {
      "recordsFiltered": 23,
      "averageProcessingTime": 58
    }
  }
]
```

**Status Values:**
- `pending`: Queued for execution
- `running`: Currently executing
- `completed`: Successfully completed
- `failed`: Failed with error

### GET /api/runs/:id

Get a single run by ID.

**Response:** Run object with pipeline details

### POST /api/pipelines/:id/execute

Manually trigger pipeline execution.

**Response:**
```json
{
  "runId": "uuid",
  "message": "Pipeline execution started"
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "ValidationError",
  "message": "Invalid category. Must be one of: cleaning, enrichment, aggregation, validation, custom",
  "statusCode": 400
}
```

### 404 Not Found
```json
{
  "error": "NotFoundError",
  "message": "TransformTemplate with id abc-123 not found",
  "statusCode": 404
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred",
  "statusCode": 500
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. In production, consider:
- 100 requests/minute for data operations
- 1000 requests/minute for read operations

## Authentication

Currently no authentication is required. In production, implement:
- JWT token-based authentication
- API key authentication for programmatic access
- Role-based access control (RBAC)

## Webhooks

Future feature: Subscribe to pipeline events via webhooks.

## SDKs

Future feature: Official SDKs for Python, JavaScript, and Go.
