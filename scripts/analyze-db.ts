import { db } from '@vercel/postgres';

async function analyzeDatabase() {
  const client = await db.connect();
  
  // Count totals
  const quoteCount = await client.query('SELECT COUNT(*) FROM quotes');
  const authorCount = await client.query('SELECT COUNT(*) FROM authors');
  const tagCount = await client.query('SELECT COUNT(*) FROM tags');
  
  console.log('=== Database Summary ===');
  console.log(`Total Quotes: ${quoteCount.rows[0].count}`);
  console.log(`Total Authors: ${authorCount.rows[0].count}`);
  console.log(`Total Tags: ${tagCount.rows[0].count}`);
  console.log('');
  
  // Check for duplicate quotes (by text body)
  const duplicates = await client.query(`
    SELECT body, COUNT(*) as count
    FROM quotes
    GROUP BY body
    HAVING COUNT(*) > 1
  `);
  
  console.log('=== Duplicate Quotes ===');
  if (duplicates.rows.length > 0) {
    console.log(`Found ${duplicates.rows.length} duplicate quote texts:`);
    duplicates.rows.forEach(row => {
      console.log(`  - "${row.body.substring(0, 50)}..." (${row.count} copies)`);
    });
  } else {
    console.log('No duplicate quotes found ✓');
  }
  console.log('');
  
  // List all authors
  const authors = await client.query(`
    SELECT name, COUNT(q.id) as quote_count
    FROM authors a
    LEFT JOIN quotes q ON a.id = q.author_id
    GROUP BY a.id, a.name
    ORDER BY quote_count DESC
  `);
  
  console.log('=== Authors ===');
  authors.rows.forEach(row => {
    console.log(`  ${row.name}: ${row.quote_count} quotes`);
  });
  console.log('');
  
  // Top 20 most used tags
  const topTags = await client.query(`
    SELECT t.name, COUNT(qt.quote_id) as usage_count
    FROM tags t
    LEFT JOIN quote_tags qt ON t.id = qt.tag_id
    GROUP BY t.id, t.name
    ORDER BY usage_count DESC
    LIMIT 20
  `);
  
  console.log('=== Top 20 Tags ===');
  topTags.rows.forEach(row => {
    console.log(`  ${row.name}: ${row.usage_count} quotes`);
  });
  
  await client.release();
}

analyzeDatabase().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
