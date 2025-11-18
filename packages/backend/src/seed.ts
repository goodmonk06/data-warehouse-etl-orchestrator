import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // Create example data source (API)
  const apiSource = await prisma.dataSource.create({
    data: {
      name: 'JSONPlaceholder API',
      type: 'api',
      configJson: {
        url: 'https://jsonplaceholder.typicode.com/users',
        method: 'GET',
      },
    },
  });

  console.log('Created API source:', apiSource.name);

  // Create example data target (DuckDB)
  const duckdbTarget = await prisma.dataTarget.create({
    data: {
      name: 'DuckDB Warehouse',
      type: 'duckdb',
      configJson: {
        dbPath: process.env.DUCKDB_PATH || './data/warehouse.duckdb',
        tableName: 'users',
      },
    },
  });

  console.log('Created DuckDB target:', duckdbTarget.name);

  // Create example pipeline
  const pipeline = await prisma.pipeline.create({
    data: {
      name: 'Users API to Warehouse',
      description: 'Extract users from JSONPlaceholder API and load into warehouse',
      sourceId: apiSource.id,
      targetId: duckdbTarget.id,
      scheduleCron: '0 */6 * * *', // Every 6 hours
      enabled: false, // Disabled by default
    },
  });

  console.log('Created pipeline:', pipeline.name);

  console.log('Seeding complete!');
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
