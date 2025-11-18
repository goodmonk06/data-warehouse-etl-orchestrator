import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clean up existing data (in reverse order of dependencies)
  await prisma.dataQualityResult.deleteMany();
  await prisma.dataQualityRule.deleteMany();
  await prisma.connectionTest.deleteMany();
  await prisma.pipelineScheduleHistory.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.notificationConfig.deleteMany();
  await prisma.pipelineDependency.deleteMany();
  await prisma.pipelineRun.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.transformTemplate.deleteMany();
  await prisma.dataSource.deleteMany();
  await prisma.dataTarget.deleteMany();

  console.log('Cleaned up existing data');

  // ===== Create Transform Templates =====
  console.log('Creating Transform Templates...');

  const cleaningTemplate1 = await prisma.transformTemplate.create({
    data: {
      name: 'Remove Null Values',
      description: 'Filters out rows with null values in critical fields',
      category: 'cleaning',
      version: '1.0.0',
      code: `// Remove rows with null values in specified fields
return data.filter(row => {
  const criticalFields = parameters.fields || Object.keys(row);
  return criticalFields.every(field => row[field] !== null && row[field] !== undefined);
});`,
      parameters: {
        fields: ['id', 'name', 'value'],
      },
      tags: ['cleaning', 'nulls', 'validation'],
      isActive: true,
    },
  });

  const cleaningTemplate2 = await prisma.transformTemplate.create({
    data: {
      name: 'Trim String Fields',
      description: 'Trims whitespace from all string fields',
      category: 'cleaning',
      version: '1.0.0',
      code: `// Trim whitespace from string fields
return data.map(row => {
  const cleaned = { ...row };
  for (const key in cleaned) {
    if (typeof cleaned[key] === 'string') {
      cleaned[key] = cleaned[key].trim();
    }
  }
  return cleaned;
});`,
      tags: ['cleaning', 'strings'],
      isActive: true,
    },
  });

  const enrichmentTemplate1 = await prisma.transformTemplate.create({
    data: {
      name: 'Add Timestamp',
      description: 'Adds processing timestamp to each row',
      category: 'enrichment',
      version: '1.0.0',
      code: `// Add timestamp to each row
const timestamp = new Date().toISOString();
return data.map(row => ({
  ...row,
  processed_at: timestamp,
}));`,
      tags: ['enrichment', 'timestamp'],
      isActive: true,
    },
  });

  const enrichmentTemplate2 = await prisma.transformTemplate.create({
    data: {
      name: 'Calculate Full Name',
      description: 'Combines first_name and last_name into full_name',
      category: 'enrichment',
      version: '1.0.0',
      code: `// Combine first and last name
return data.map(row => ({
  ...row,
  full_name: \`\${row.first_name || ''} \${row.last_name || ''}\`.trim(),
}));`,
      tags: ['enrichment', 'name', 'user-data'],
      isActive: true,
    },
  });

  const aggregationTemplate1 = await prisma.transformTemplate.create({
    data: {
      name: 'Group By and Sum',
      description: 'Groups data by specified field and sums numeric values',
      category: 'aggregation',
      version: '1.0.0',
      code: `// Group by field and sum values
const groupBy = parameters.groupBy || 'category';
const sumField = parameters.sumField || 'amount';

const grouped = {};
data.forEach(row => {
  const key = row[groupBy];
  if (!grouped[key]) {
    grouped[key] = { [groupBy]: key, [sumField]: 0, count: 0 };
  }
  grouped[key][sumField] += row[sumField] || 0;
  grouped[key].count += 1;
});

return Object.values(grouped);`,
      parameters: {
        groupBy: 'category',
        sumField: 'amount',
      },
      tags: ['aggregation', 'grouping', 'sum'],
      isActive: true,
    },
  });

  const validationTemplate1 = await prisma.transformTemplate.create({
    data: {
      name: 'Email Validation',
      description: 'Validates email format and adds validation flag',
      category: 'validation',
      version: '1.0.0',
      code: `// Validate email format
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
return data.map(row => ({
  ...row,
  email_valid: emailRegex.test(row.email || ''),
}));`,
      tags: ['validation', 'email'],
      isActive: true,
    },
  });

  const validationTemplate2 = await prisma.transformTemplate.create({
    data: {
      name: 'Range Validation',
      description: 'Validates numeric values are within specified range',
      category: 'validation',
      version: '1.0.0',
      code: `// Validate numeric range
const field = parameters.field || 'value';
const min = parameters.min || 0;
const max = parameters.max || 100;

return data.map(row => ({
  ...row,
  [\`\${field}_in_range\`]: row[field] >= min && row[field] <= max,
}));`,
      parameters: {
        field: 'value',
        min: 0,
        max: 100,
      },
      tags: ['validation', 'range', 'numeric'],
      isActive: true,
    },
  });

  console.log(`Created ${7} Transform Templates`);

  // ===== Create Data Sources =====
  console.log('Creating Data Sources...');

  const pgSource = await prisma.dataSource.create({
    data: {
      name: 'E-commerce Orders DB',
      type: 'postgres',
      description: 'Production PostgreSQL database containing order data',
      configJson: {
        host: 'orders-db.example.com',
        port: 5432,
        database: 'ecommerce',
        user: 'etl_user',
        password: 'encrypted_password',
        table: 'orders',
      },
      tags: ['production', 'ecommerce', 'orders'],
      isActive: true,
    },
  });

  const apiSource = await prisma.dataSource.create({
    data: {
      name: 'Customer API',
      type: 'api',
      description: 'REST API providing customer data',
      configJson: {
        url: 'https://api.example.com/customers',
        method: 'GET',
        headers: {
          Authorization: 'Bearer token123',
        },
        pagination: {
          type: 'page',
          pageSize: 100,
        },
      },
      tags: ['api', 'customers'],
      isActive: true,
    },
  });

  const csvSource = await prisma.dataSource.create({
    data: {
      name: 'Product Catalog CSV',
      type: 'csv',
      description: 'Daily product catalog export',
      configJson: {
        path: '/data/uploads/products.csv',
        delimiter: ',',
        hasHeader: true,
        encoding: 'utf-8',
      },
      tags: ['csv', 'products'],
      isActive: true,
    },
  });

  console.log(`Created ${3} Data Sources`);

  // ===== Create Data Targets =====
  console.log('Creating Data Targets...');

  const duckdbTarget = await prisma.dataTarget.create({
    data: {
      name: 'Analytics Warehouse (DuckDB)',
      type: 'duckdb',
      description: 'Local DuckDB analytical database',
      configJson: {
        path: './data/warehouse.duckdb',
        schema: 'analytics',
      },
      tags: ['analytics', 'duckdb'],
      isActive: true,
    },
  });

  const bigqueryTarget = await prisma.dataTarget.create({
    data: {
      name: 'GCP BigQuery Data Lake',
      type: 'bigquery',
      description: 'Google Cloud BigQuery data warehouse',
      configJson: {
        projectId: 'my-project-123',
        datasetId: 'analytics',
        credentials: 'path/to/service-account.json',
      },
      tags: ['production', 'bigquery', 'gcp'],
      isActive: true,
    },
  });

  console.log(`Created ${2} Data Targets`);

  // ===== Create Pipelines =====
  console.log('Creating Pipelines...');

  const ordersPipeline = await prisma.pipeline.create({
    data: {
      name: 'Orders ETL Pipeline',
      description: 'Extract orders from PostgreSQL, clean and enrich data, load to warehouse',
      sourceId: pgSource.id,
      targetId: duckdbTarget.id,
      transformTemplateId: cleaningTemplate1.id,
      scheduleCron: '0 2 * * *', // Daily at 2 AM
      enabled: true,
      tags: ['orders', 'daily', 'critical'],
      priority: 8,
      timeoutSeconds: 3600,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 5000,
      },
      createdBy: 'admin',
    },
  });

  const customersPipeline = await prisma.pipeline.create({
    data: {
      name: 'Customer Sync Pipeline',
      description: 'Sync customer data from API to BigQuery',
      sourceId: apiSource.id,
      targetId: bigqueryTarget.id,
      transformTemplateId: enrichmentTemplate2.id,
      scheduleCron: '0 */4 * * *', // Every 4 hours
      enabled: true,
      tags: ['customers', 'frequent', 'api'],
      priority: 5,
      timeoutSeconds: 1800,
      createdBy: 'data-team',
    },
  });

  const productsPipeline = await prisma.pipeline.create({
    data: {
      name: 'Product Catalog Pipeline',
      description: 'Load and validate product catalog from CSV',
      sourceId: csvSource.id,
      targetId: duckdbTarget.id,
      transformTemplateId: validationTemplate1.id,
      scheduleCron: '30 3 * * *', // Daily at 3:30 AM
      enabled: true,
      tags: ['products', 'daily'],
      priority: 3,
      timeoutSeconds: 900,
      createdBy: 'data-team',
    },
  });

  console.log(`Created ${3} Pipelines`);

  // ===== Create Pipeline Runs =====
  console.log('Creating Pipeline Runs...');

  await prisma.pipelineRun.create({
    data: {
      pipelineId: ordersPipeline.id,
      status: 'completed',
      startedAt: new Date('2024-01-15T02:00:00Z'),
      completedAt: new Date('2024-01-15T02:15:32Z'),
      rowsProcessed: 15847,
      triggeredBy: 'scheduler',
      executionTimeMs: 932000,
      dataQualityScore: 98.5,
      metadata: {
        recordsFiltered: 23,
        averageProcessingTime: 58,
      },
    },
  });

  await prisma.pipelineRun.create({
    data: {
      pipelineId: ordersPipeline.id,
      status: 'completed',
      startedAt: new Date('2024-01-16T02:00:00Z'),
      completedAt: new Date('2024-01-16T02:12:18Z'),
      rowsProcessed: 14235,
      triggeredBy: 'scheduler',
      executionTimeMs: 738000,
      dataQualityScore: 99.2,
    },
  });

  await prisma.pipelineRun.create({
    data: {
      pipelineId: customersPipeline.id,
      status: 'failed',
      startedAt: new Date('2024-01-16T08:00:00Z'),
      completedAt: new Date('2024-01-16T08:05:43Z'),
      rowsProcessed: 0,
      errorMessage: 'API authentication failed: invalid token',
      triggeredBy: 'scheduler',
      retryCount: 3,
      executionTimeMs: 343000,
    },
  });

  console.log(`Created sample Pipeline Runs`);

  // ===== Create Data Quality Rules =====
  console.log('Creating Data Quality Rules...');

  await prisma.dataQualityRule.create({
    data: {
      pipelineId: ordersPipeline.id,
      name: 'Order ID Uniqueness',
      description: 'Ensures all order IDs are unique',
      ruleType: 'uniqueness',
      config: {
        field: 'order_id',
      },
      severity: 'critical',
      isActive: true,
    },
  });

  await prisma.dataQualityRule.create({
    data: {
      pipelineId: ordersPipeline.id,
      name: 'Required Fields Completeness',
      description: 'Checks that required fields are not null',
      ruleType: 'completeness',
      config: {
        fields: ['order_id', 'customer_id', 'order_date', 'total_amount'],
        threshold: 0.99,
      },
      severity: 'critical',
      isActive: true,
    },
  });

  await prisma.dataQualityRule.create({
    data: {
      pipelineId: customersPipeline.id,
      name: 'Email Format Validation',
      description: 'Validates email addresses follow correct format',
      ruleType: 'schema',
      config: {
        field: 'email',
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      },
      severity: 'warning',
      isActive: true,
    },
  });

  console.log(`Created Data Quality Rules`);

  // ===== Create Notification Configs =====
  console.log('Creating Notification Configs...');

  await prisma.notificationConfig.create({
    data: {
      name: 'Pipeline Failure Alerts',
      type: 'email',
      config: {
        recipients: ['data-team@example.com', 'oncall@example.com'],
        subject: 'ETL Pipeline Failed: {{pipeline_name}}',
        template: 'pipeline_failure',
      },
      events: ['pipeline.failed'],
      isActive: true,
    },
  });

  await prisma.notificationConfig.create({
    data: {
      name: 'Slack Success Notifications',
      type: 'slack',
      config: {
        webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
        channel: '#data-pipeline-alerts',
      },
      events: ['pipeline.completed'],
      isActive: true,
      filters: {
        priority: { $gte: 7 },
      },
    },
  });

  console.log(`Created Notification Configs`);

  console.log('Seed completed successfully!');
  console.log('---');
  console.log('Summary:');
  console.log(`- Transform Templates: 7`);
  console.log(`- Data Sources: 3`);
  console.log(`- Data Targets: 2`);
  console.log(`- Pipelines: 3`);
  console.log(`- Pipeline Runs: 3 (sample history)`);
  console.log(`- Data Quality Rules: 3`);
  console.log(`- Notification Configs: 2`);
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
