import { db } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkDuplicates() {
  const client = await db.connect();

  console.log('\n=== CHECKING FOR DUPLICATE AUTHORS ===');
  const duplicateAuthors = await client.query(`
    SELECT name, COUNT(*) as count, ARRAY_AGG(id) as ids
    FROM authors
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY count DESC, name
  `);
  
  if (duplicateAuthors.rows.length > 0) {
    console.log(`Found ${duplicateAuthors.rows.length} duplicate author(s):`);
    duplicateAuthors.rows.forEach(row => {
      console.log(`  - "${row.name}": ${row.count} entries (IDs: ${row.ids.join(', ')})`);
    });
  } else {
    console.log('No duplicate authors found.');
  }

  console.log('\n=== CHECKING FOR DUPLICATE TAGS ===');
  const duplicateTags = await client.query(`
    SELECT name, COUNT(*) as count, ARRAY_AGG(id) as ids
    FROM tags
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY count DESC, name
  `);
  
  if (duplicateTags.rows.length > 0) {
    console.log(`Found ${duplicateTags.rows.length} duplicate tag(s):`);
    duplicateTags.rows.forEach(row => {
      console.log(`  - "${row.name}": ${row.count} entries (IDs: ${row.ids.join(', ')})`);
    });
  } else {
    console.log('No duplicate tags found.');
  }

  console.log('\n=== CHECKING FOR DUPLICATE QUOTES ===');
  const duplicateQuotes = await client.query(`
    SELECT body, COUNT(*) as count, ARRAY_AGG(id) as ids
    FROM quotes
    GROUP BY body
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `);
  
  if (duplicateQuotes.rows.length > 0) {
    console.log(`Found ${duplicateQuotes.rows.length} duplicate quote(s) (showing top 10):`);
    duplicateQuotes.rows.forEach(row => {
      console.log(`  - "${row.body.substring(0, 50)}...": ${row.count} entries (IDs: ${row.ids.join(', ')})`);
    });
  } else {
    console.log('No duplicate quotes found.');
  }

  await client.release();
}

checkDuplicates().catch((err) => {
  console.error('Check failed:', err);
  process.exit(1);
});
