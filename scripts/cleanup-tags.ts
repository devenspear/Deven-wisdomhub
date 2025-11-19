import { db } from '@vercel/postgres';

async function cleanupTags() {
  const client = await db.connect();

  console.log('=== Cleaning Up Orphaned Tags ===\n');

  // Find tags not used by any quotes
  const orphanedTags = await client.query(`
    SELECT t.id, t.name
    FROM tags t
    LEFT JOIN quote_tags qt ON t.id = qt.tag_id
    WHERE qt.tag_id IS NULL
  `);

  if (orphanedTags.rows.length === 0) {
    console.log('No orphaned tags found ✓\n');
  } else {
    console.log(`Found ${orphanedTags.rows.length} orphaned tags:\n`);
    for (const tag of orphanedTags.rows) {
      console.log(`  - ${tag.name}`);
    }

    // Delete orphaned tags
    await client.query(`
      DELETE FROM tags
      WHERE id IN (
        SELECT t.id
        FROM tags t
        LEFT JOIN quote_tags qt ON t.id = qt.tag_id
        WHERE qt.tag_id IS NULL
      )
    `);

    console.log(`\n✓ Removed ${orphanedTags.rows.length} orphaned tags\n`);
  }

  // Final count
  const finalTags = await client.query('SELECT COUNT(*) FROM tags');
  console.log(`Final tag count: ${finalTags.rows[0].count}`);

  await client.release();
}

cleanupTags().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
