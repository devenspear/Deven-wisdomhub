import { db } from '@vercel/postgres';

async function mergeAuthors() {
  const client = await db.connect();

  console.log('=== Checking for Duplicate Authors ===\n');

  // Get all authors
  const authors = await client.query(`
    SELECT id, name FROM authors ORDER BY LOWER(name)
  `);

  const authorMap = new Map<string, string[]>();

  // Group authors by lowercase name to find case-insensitive duplicates
  for (const author of authors.rows) {
    const key = author.name.toLowerCase().trim();
    if (!authorMap.has(key)) {
      authorMap.set(key, []);
    }
    authorMap.get(key)!.push(author.name);
  }

  // Find duplicates
  const duplicates: Array<{canonical: string; variants: string[]}> = [];
  for (const [key, names] of authorMap.entries()) {
    if (names.length > 1) {
      // Use the most common capitalization or first one
      duplicates.push({ canonical: names[0], variants: names.slice(1) });
    }
  }

  if (duplicates.length === 0) {
    console.log('No duplicate authors found ✓\n');
  } else {
    console.log(`Found ${duplicates.length} duplicate author names:\n`);
    for (const dup of duplicates) {
      console.log(`  "${dup.canonical}" has variants: ${dup.variants.map(v => `"${v}"`).join(', ')}`);

      // Get IDs for canonical and variants
      const canonicalResult = await client.query(
        'SELECT id FROM authors WHERE name = $1',
        [dup.canonical]
      );
      const canonicalId = canonicalResult.rows[0].id;

      for (const variant of dup.variants) {
        const variantResult = await client.query(
          'SELECT id FROM authors WHERE name = $1',
          [variant]
        );
        if (variantResult.rows.length > 0) {
          const variantId = variantResult.rows[0].id;

          // Update quotes to use canonical author
          await client.query(
            'UPDATE quotes SET author_id = $1 WHERE author_id = $2',
            [canonicalId, variantId]
          );

          // Delete variant author
          await client.query(
            'DELETE FROM authors WHERE id = $1',
            [variantId]
          );
          console.log(`    ✓ Merged "${variant}" into "${dup.canonical}"`);
        }
      }
    }
  }

  // Final count
  const finalAuthors = await client.query('SELECT COUNT(*) FROM authors');
  console.log(`\nFinal author count: ${finalAuthors.rows[0].count}`);

  await client.release();
}

mergeAuthors().catch((err) => {
  console.error('Merge failed:', err);
  process.exit(1);
});
