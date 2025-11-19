import { db } from '@vercel/postgres';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
  const client = await db.connect();
  const migrationsDir = path.join(process.cwd(), 'app/api/_db/migrations');
  const files = await fs.readdir(migrationsDir);
  files.sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      await client.query(sql);
      console.log(`Applied migration: ${file}`);
    }
  }

  await client.release();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
