import { db } from '@vercel/postgres';

async function cleanupDuplicates() {
  const client = await db.connect();
  
  console.log('=== Removing Duplicate Quotes ===');
  
  // Find and remove duplicate quotes, keeping the first one by created_at
  const duplicates = await client.query(`
    WITH ranked_quotes AS (
      SELECT id, body,
             ROW_NUMBER() OVER (PARTITION BY body ORDER BY created_at) as rn
      FROM quotes
    )
    SELECT
      rq.body,
      (SELECT id FROM ranked_quotes WHERE body = rq.body AND rn = 1) as keep_id,
      array_agg(rq.id) as all_ids
    FROM ranked_quotes rq
    WHERE rq.body IN (
      SELECT body FROM quotes GROUP BY body HAVING COUNT(*) > 1
    )
    GROUP BY rq.body
  `);
  
  let removedCount = 0;
  for (const dup of duplicates.rows) {
    const idsToDelete = dup.all_ids.filter((id: string) => id !== dup.keep_id);
    
    if (idsToDelete.length > 0) {
      // Delete from quote_tags first (foreign key constraint)
      await client.query('DELETE FROM quote_tags WHERE quote_id = ANY($1)', [idsToDelete]);
      // Delete the duplicate quotes
      await client.query('DELETE FROM quotes WHERE id = ANY($1)', [idsToDelete]);
      removedCount += idsToDelete.length;
      console.log(`Removed ${idsToDelete.length} duplicate(s) of: "${dup.body.substring(0, 50)}..."`);
    }
  }
  
  console.log(`\nTotal duplicate quotes removed: ${removedCount}`);
  
  // Check final counts
  const finalQuotes = await client.query('SELECT COUNT(*) FROM quotes');
  const finalAuthors = await client.query('SELECT COUNT(*) FROM authors');
  const finalTags = await client.query('SELECT COUNT(*) FROM tags');
  
  console.log('\n=== Final Database Summary ===');
  console.log(`Quotes: ${finalQuotes.rows[0].count}`);
  console.log(`Authors: ${finalAuthors.rows[0].count}`);
  console.log(`Tags: ${finalTags.rows[0].count}`);
  
  await client.release();
}

cleanupDuplicates().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
