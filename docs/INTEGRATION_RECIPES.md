# Integration Recipes

Common patterns and recipes for integrating with the ETL Orchestrator.

## Table of Contents

1. [Complete E-commerce Pipeline](#complete-e-commerce-pipeline)
2. [API Data Sync with Quality Checks](#api-data-sync-with-quality-checks)
3. [Multi-Source Aggregation](#multi-source-aggregation)
4. [Real-time Monitoring Dashboard](#real-time-monitoring-dashboard)
5. [Custom Transform Development](#custom-transform-development)
6. [Error Handling and Retries](#error-handling-and-retries)
7. [Scheduled Batch Processing](#scheduled-batch-processing)
8. [Data Quality Monitoring](#data-quality-monitoring)

---

## Complete E-commerce Pipeline

### Scenario
Extract daily orders from PostgreSQL, clean and enrich the data, check quality, and load to analytical warehouse.

### Step 1: Create Data Source

```bash
curl -X POST http://localhost:3000/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-commerce Orders DB",
    "type": "postgres",
    "description": "Production PostgreSQL database containing order data",
    "configJson": {
      "host": "orders-db.example.com",
      "port": 5432,
      "database": "ecommerce",
      "user": "etl_user",
      "password": "secure_password",
      "table": "orders"
    },
    "tags": ["production", "orders"],
    "isActive": true
  }'
```

### Step 2: Create Data Target

```bash
curl -X POST http://localhost:3000/api/targets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Analytics Warehouse",
    "type": "duckdb",
    "description": "DuckDB analytical database",
    "configJson": {
      "path": "./data/warehouse.duckdb",
      "schema": "analytics"
    },
    "tags": ["analytics"],
    "isActive": true
  }'
```

### Step 3: Test Connections

```bash
# Test source
curl -X POST http://localhost:3000/api/sources/{source_id}/test

# Test target
curl -X POST http://localhost:3000/api/targets/{target_id}/test
```

### Step 4: Create or Select Transform Template

```bash
# List available cleaning templates
curl http://localhost:3000/api/transform-templates?category=cleaning

# Or create a custom one
curl -X POST http://localhost:3000/api/transform-templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Orders Data Cleaning",
    "category": "cleaning",
    "code": "return data.filter(row => row.total_amount > 0 && row.customer_id);",
    "description": "Remove invalid orders"
  }'
```

### Step 5: Create Data Quality Rules

```bash
# Completeness check
curl -X POST http://localhost:3000/api/data-quality-rules \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineId": "{pipeline_id}",
    "name": "Required Fields Check",
    "ruleType": "completeness",
    "config": {
      "fields": ["order_id", "customer_id", "order_date", "total_amount"],
      "threshold": 0.99
    },
    "severity": "critical"
  }'

# Uniqueness check
curl -X POST http://localhost:3000/api/data-quality-rules \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineId": "{pipeline_id}",
    "name": "Order ID Uniqueness",
    "ruleType": "uniqueness",
    "config": {
      "field": "order_id"
    },
    "severity": "critical"
  }'
```

### Step 6: Create Pipeline

```bash
curl -X POST http://localhost:3000/api/pipelines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Orders ETL Pipeline",
    "description": "Daily orders ETL with quality checks",
    "sourceId": "{source_id}",
    "targetId": "{target_id}",
    "transformTemplateId": "{template_id}",
    "scheduleCron": "0 2 * * *",
    "enabled": true,
    "priority": 8,
    "timeoutSeconds": 3600,
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMs": 5000
    },
    "tags": ["orders", "critical"],
    "createdBy": "admin"
  }'
```

### Step 7: Execute and Monitor

```bash
# Manual execution for testing
curl -X POST http://localhost:3000/api/pipelines/{pipeline_id}/execute

# Check run status
curl http://localhost:3000/api/runs/{run_id}

# View quality results
curl http://localhost:3000/api/runs/{run_id}/data-quality-results
```

---

## API Data Sync with Quality Checks

### Scenario
Sync customer data from a REST API every 4 hours, validate email formats, and load to BigQuery.

### Complete Example

```javascript
// 1. Create API source
const source = await fetch('http://localhost:3000/api/sources', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Customer API',
    type: 'api',
    configJson: {
      url: 'https://api.example.com/customers',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN',
        'Accept': 'application/json'
      },
      pagination: {
        type: 'page',
        pageSize: 100
      }
    },
    tags: ['api', 'customers']
  })
}).then(r => r.json());

// 2. Create BigQuery target
const target = await fetch('http://localhost:3000/api/targets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'GCP BigQuery',
    type: 'bigquery',
    configJson: {
      projectId: 'my-project',
      datasetId: 'customers',
      credentials: '/path/to/service-account.json'
    },
    tags: ['gcp', 'bigquery']
  })
}).then(r => r.json());

// 3. Create enrichment template
const template = await fetch('http://localhost:3000/api/transform-templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Customer Enrichment',
    category: 'enrichment',
    code: `
      const now = new Date().toISOString();
      return data.map(row => ({
        ...row,
        full_name: \`\${row.first_name} \${row.last_name}\`.trim(),
        email_lower: (row.email || '').toLowerCase(),
        synced_at: now
      }));
    `,
    description: 'Enrich customer data with derived fields'
  })
}).then(r => r.json());

// 4. Create pipeline
const pipeline = await fetch('http://localhost:3000/api/pipelines', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Customer Sync Pipeline',
    sourceId: source.id,
    targetId: target.id,
    transformTemplateId: template.id,
    scheduleCron: '0 */4 * * *', // Every 4 hours
    enabled: true,
    priority: 5
  })
}).then(r => r.json());

// 5. Add quality rules
await fetch('http://localhost:3000/api/data-quality-rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pipelineId: pipeline.id,
    name: 'Email Validation',
    ruleType: 'schema',
    config: {
      field: 'email',
      pattern: '^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$'
    },
    severity: 'warning'
  })
});

console.log('Customer sync pipeline created:', pipeline.id);
```

---

## Multi-Source Aggregation

### Scenario
Combine data from multiple sources (PostgreSQL, CSV, API) into a unified analytics table.

### Approach

```python
import requests

BASE_URL = 'http://localhost:3000'

# 1. Create multiple sources
sources = []

# PostgreSQL orders
sources.append(requests.post(f'{BASE_URL}/api/sources', json={
    'name': 'Orders DB',
    'type': 'postgres',
    'configJson': {'host': 'orders-db', 'database': 'orders', 'table': 'orders'}
}).json())

# CSV products
sources.append(requests.post(f'{BASE_URL}/api/sources', json={
    'name': 'Products CSV',
    'type': 'csv',
    'configJson': {'path': '/data/products.csv'}
}).json())

# API customers
sources.append(requests.post(f'{BASE_URL}/api/sources', json={
    'name': 'Customers API',
    'type': 'api',
    'configJson': {'url': 'https://api.example.com/customers'}
}).json())

# 2. Create unified target
target = requests.post(f'{BASE_URL}/api/targets', json={
    'name': 'Unified Analytics',
    'type': 'duckdb',
    'configJson': {'path': './analytics.duckdb', 'schema': 'unified'}
}).json()

# 3. Create aggregation template
template = requests.post(f'{BASE_URL}/api/transform-templates', json={
    'name': 'Multi-Source Join',
    'category': 'aggregation',
    'code': '''
        // Assuming data is pre-joined by upstream process
        // Group by product category and sum revenue
        const aggregated = {};
        data.forEach(row => {
            const key = row.product_category;
            if (!aggregated[key]) {
                aggregated[key] = {
                    category: key,
                    total_revenue: 0,
                    order_count: 0,
                    unique_customers: new Set()
                };
            }
            aggregated[key].total_revenue += row.total_amount;
            aggregated[key].order_count += 1;
            aggregated[key].unique_customers.add(row.customer_id);
        });

        return Object.values(aggregated).map(item => ({
            ...item,
            unique_customers: item.unique_customers.size
        }));
    ''',
    'description': 'Aggregate orders by product category'
}).json()

# 4. Create pipelines for each source
for source in sources:
    pipeline = requests.post(f'{BASE_URL}/api/pipelines', json={
        'name': f'{source["name"]} to Analytics',
        'sourceId': source['id'],
        'targetId': target['id'],
        'transformTemplateId': template['id'] if 'Orders' in source['name'] else None,
        'scheduleCron': '0 3 * * *',  # Daily at 3 AM
        'enabled': True,
        'priority': 5
    }).json()

    print(f'Created pipeline: {pipeline["id"]}')
```

---

## Real-time Monitoring Dashboard

### Scenario
Build a dashboard to monitor pipeline health and connection status.

### API Calls for Dashboard

```javascript
// Dashboard component
async function fetchDashboardData() {
  const [health, pipelines, recentRuns, qualitySummary] = await Promise.all([
    // Connection health
    fetch('http://localhost:3000/api/connection-health').then(r => r.json()),

    // All pipelines with stats
    fetch('http://localhost:3000/api/pipelines').then(r => r.json()),

    // Recent test results
    fetch('http://localhost:3000/api/connection-tests?limit=10').then(r => r.json()),

    // Recent quality checks (custom endpoint or aggregate from runs)
    fetch('http://localhost:3000/api/pipelines')
      .then(r => r.json())
      .then(async (pipelines) => {
        const results = [];
        for (const pipeline of pipelines.slice(0, 5)) {
          const runs = await fetch(`http://localhost:3000/api/pipelines/${pipeline.id}/runs`)
            .then(r => r.json());
          if (runs[0]) {
            const quality = await fetch(`http://localhost:3000/api/runs/${runs[0].id}/data-quality-results`)
              .then(r => r.json());
            results.push({ pipeline: pipeline.name, quality });
          }
        }
        return results;
      })
  ]);

  return {
    connectionHealth: health,
    pipelines: pipelines.map(p => ({
      name: p.name,
      status: p.enabled ? 'active' : 'disabled',
      lastRun: p.runs?.[0]?.completedAt,
      successRate: calculateSuccessRate(p.runs)
    })),
    recentTests: recentRuns,
    qualityScore: calculateOverallQuality(qualitySummary)
  };
}

function calculateSuccessRate(runs = []) {
  if (runs.length === 0) return 0;
  const successful = runs.filter(r => r.status === 'completed').length;
  return (successful / runs.length * 100).toFixed(1);
}
```

### Dashboard UI Example (React)

```jsx
function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboardData().then(setData);
    const interval = setInterval(() => {
      fetchDashboardData().then(setData);
    }, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <div className="health-cards">
        <Card title="Source Health">
          <Progress
            value={data.connectionHealth.sources.healthy / data.connectionHealth.sources.total * 100}
            label={`${data.connectionHealth.sources.healthy}/${data.connectionHealth.sources.total}`}
          />
        </Card>

        <Card title="Target Health">
          <Progress
            value={data.connectionHealth.targets.healthy / data.connectionHealth.targets.total * 100}
            label={`${data.connectionHealth.targets.healthy}/${data.connectionHealth.targets.total}`}
          />
        </Card>

        <Card title="Recent Tests">
          <Progress
            value={data.connectionHealth.recentTests.passed / data.connectionHealth.recentTests.total * 100}
            label={`${data.connectionHealth.recentTests.passed}/${data.connectionHealth.recentTests.total}`}
          />
        </Card>
      </div>

      <PipelineTable pipelines={data.pipelines} />
      <TestHistoryTable tests={data.recentTests} />
    </div>
  );
}
```

---

## Custom Transform Development

### Best Practices

```javascript
// Good: Use parameters for flexibility
{
  "name": "Configurable Filter",
  "code": `
    const field = parameters.field || 'status';
    const values = parameters.allowedValues || ['active'];
    return data.filter(row => values.includes(row[field]));
  `,
  "parameters": {
    "field": "status",
    "allowedValues": ["active", "pending"]
  }
}

// Good: Handle edge cases
{
  "name": "Safe Email Extraction",
  "code": `
    return data.map(row => ({
      ...row,
      email_domain: (() => {
        try {
          const email = row.email || '';
          const parts = email.split('@');
          return parts.length === 2 ? parts[1] : 'unknown';
        } catch (e) {
          return 'error';
        }
      })()
    }));
  `
}

// Good: Add logging for debugging
{
  "name": "Transform with Logging",
  "code": `
    console.log('Processing', data.length, 'rows');
    const result = data.map(row => {
      // transformation logic
      return { ...row, processed: true };
    });
    console.log('Completed processing, output:', result.length, 'rows');
    return result;
  `
}
```

### Testing Transforms

```bash
# Validate code before creating
curl -X POST http://localhost:3000/api/transform-templates/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "return data.map(row => ({ ...row, test: true }));"
  }'

# Response indicates if valid
# { "valid": true }
```

---

## Error Handling and Retries

### Configure Retry Policy

```json
{
  "name": "Resilient Pipeline",
  "retryPolicy": {
    "maxRetries": 5,
    "backoffMs": 10000
  },
  "timeoutSeconds": 3600
}
```

### Implement Circuit Breaker Pattern

```javascript
// Create notification for failures
await fetch('http://localhost:3000/api/notification-configs', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Pipeline Failure Circuit Breaker',
    type: 'email',
    config: {
      recipients: ['oncall@example.com'],
      subject: 'ALERT: Pipeline Failed {{retry_count}} Times'
    },
    events: ['pipeline.failed'],
    filters: {
      retryCount: { $gte: 3 }  // Alert after 3 failures
    },
    isActive: true
  })
});
```

---

## Scheduled Batch Processing

### Common Cron Patterns

```bash
# Every day at 2 AM
"scheduleCron": "0 2 * * *"

# Every 4 hours
"scheduleCron": "0 */4 * * *"

# Every Monday at 9 AM
"scheduleCron": "0 9 * * 1"

# First day of month at midnight
"scheduleCron": "0 0 1 * *"

# Every 15 minutes during business hours (9 AM - 5 PM, Mon-Fri)
"scheduleCron": "*/15 9-17 * * 1-5"
```

### Stagger Pipeline Execution

```javascript
const pipelines = [
  { name: 'Pipeline A', cron: '0 2 * * *' },   // 2:00 AM
  { name: 'Pipeline B', cron: '30 2 * * *' },  // 2:30 AM
  { name: 'Pipeline C', cron: '0 3 * * *' },   // 3:00 AM
];

for (const config of pipelines) {
  await createPipeline(config);
}
```

---

## Data Quality Monitoring

### Comprehensive Quality Suite

```javascript
async function setupQualityRules(pipelineId) {
  const rules = [
    // Completeness
    {
      name: 'Required Fields Present',
      ruleType: 'completeness',
      config: { fields: ['id', 'created_at', 'user_id'], threshold: 0.99 },
      severity: 'critical'
    },

    // Uniqueness
    {
      name: 'Primary Key Unique',
      ruleType: 'uniqueness',
      config: { field: 'id' },
      severity: 'critical'
    },

    // Range
    {
      name: 'Amount Within Range',
      ruleType: 'range',
      config: { field: 'amount', min: 0, max: 1000000 },
      severity: 'warning'
    },

    // Schema
    {
      name: 'Email Format',
      ruleType: 'schema',
      config: { field: 'email', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      severity: 'warning'
    },

    // Custom
    {
      name: 'Business Logic Check',
      ruleType: 'custom',
      config: {
        code: `
          const invalidRecords = data.filter(row =>
            row.status === 'completed' && !row.completion_date
          );
          return {
            passed: invalidRecords.length === 0,
            score: ((data.length - invalidRecords.length) / data.length) * 100,
            violations: invalidRecords.length,
            message: invalidRecords.length === 0
              ? 'All completed records have completion dates'
              : \`Found \${invalidRecords.length} completed records without completion dates\`
          };
        `
      },
      severity: 'warning'
    }
  ];

  for (const rule of rules) {
    await fetch('http://localhost:3000/api/data-quality-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rule, pipelineId })
    });
  }
}
```

### Quality Score Trending

```javascript
async function getQualityTrend(pipelineId, days = 7) {
  const runs = await fetch(`http://localhost:3000/api/pipelines/${pipelineId}/runs`)
    .then(r => r.json());

  const recentRuns = runs
    .filter(r => {
      const runDate = new Date(r.startedAt);
      const daysAgo = (Date.now() - runDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= days;
    })
    .slice(0, 20);

  const scores = await Promise.all(
    recentRuns.map(async run => {
      const results = await fetch(`http://localhost:3000/api/runs/${run.id}/data-quality-results`)
        .then(r => r.json());

      return {
        date: run.startedAt,
        score: run.dataQualityScore,
        passed: results.every(r => r.passed)
      };
    })
  );

  return scores;
}
```

---

## Tips and Tricks

### 1. Bulk Operations

Use Promise.all for parallel operations:

```javascript
// Create multiple templates in parallel
const templates = [template1Data, template2Data, template3Data];
const created = await Promise.all(
  templates.map(t =>
    fetch('http://localhost:3000/api/transform-templates', {
      method: 'POST',
      body: JSON.stringify(t)
    }).then(r => r.json())
  )
);
```

### 2. Connection Testing Best Practices

```javascript
// Test all connections before pipeline execution
async function healthCheck() {
  const [sources, targets] = await Promise.all([
    fetch('http://localhost:3000/api/sources').then(r => r.json()),
    fetch('http://localhost:3000/api/targets').then(r => r.json())
  ]);

  const tests = await Promise.all([
    ...sources.map(s =>
      fetch(`http://localhost:3000/api/sources/${s.id}/test`, { method: 'POST' })
    ),
    ...targets.map(t =>
      fetch(`http://localhost:3000/api/targets/${t.id}/test`, { method: 'POST' })
    )
  ]);

  const failures = tests.filter(t => t.status === 'failed');
  if (failures.length > 0) {
    console.error('Health check failed:', failures);
    return false;
  }

  return true;
}
```

### 3. Template Library Management

```javascript
// Export all templates for backup
async function exportTemplates() {
  const templates = await fetch('http://localhost:3000/api/transform-templates')
    .then(r => r.json());

  const fs = require('fs');
  fs.writeFileSync('template-backup.json', JSON.stringify(templates, null, 2));
}

// Import templates
async function importTemplates(backup) {
  const templates = JSON.parse(backup);
  for (const template of templates) {
    delete template.id; // Let server generate new IDs
    await fetch('http://localhost:3000/api/transform-templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }
}
```
