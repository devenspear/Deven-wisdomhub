import { db } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function removeDuplicates() {
    const client = await db.connect();

    console.log('\n=== REMOVING DUPLICATE QUOTES ===');

    // Find all duplicate quotes
    const duplicateQuotes = await client.query(`
    SELECT body, ARRAY_AGG(id ORDER BY created_at) as ids
    FROM quotes
    GROUP BY body
    HAVING COUNT(*) > 1
  `);

    let totalRemoved = 0;

    for (const row of duplicateQuotes.rows) {
        const idsToKeep = [row.ids[0]]; // Keep the first one
        const idsToDelete = row.ids.slice(1); // Delete the rest

        console.log(`\nQuote: "${row.body.substring(0, 50)}..."`);
        console.log(`  Keeping ID: ${idsToKeep[0]}`);
        console.log(`  Deleting IDs: ${idsToDelete.join(', ')}`);

        // Delete quote_tags associations for duplicates
        await client.query(`
      DELETE FROM quote_tags
      WHERE quote_id = ANY($1)
    `, [idsToDelete]);

        // Delete the duplicate quotes
        const result = await client.query(`
      DELETE FROM quotes
      WHERE id = ANY($1)
    `, [idsToDelete]);

        totalRemoved += result.rowCount || 0;
    }

    console.log(`\n✅ Removed ${totalRemoved} duplicate quote(s)`);

    await client.release();
}

removeDuplicates().catch((err) => {
    console.error('Removal failed:', err);
    process.exit(1);
});
