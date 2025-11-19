import { db } from '@vercel/postgres';
import { promises as fs } from 'fs';
import path from 'path';

interface Quote {
  id: string;
  text: string;
  author_provided: string | null;
  author_actual: string;
  source: string;
  tags: string[];
  notes: string;
}

async function importQuotes() {
  const client = await db.connect();
  const quotesPath = path.join(process.cwd(), 'data', 'quotes.json');
  const quotesData = await fs.readFile(quotesPath, 'utf-8');
  const quotes: Quote[] = JSON.parse(quotesData);

  for (const quote of quotes) {
    let authorId: string;
    const authorName = quote.author_actual || quote.author_provided || 'Unknown';

    // Find or create author
    let authorResult = await client.query('SELECT id FROM authors WHERE name = $1', [authorName]);
    if (authorResult.rows.length > 0) {
      authorId = authorResult.rows[0].id;
    } else {
      authorResult = await client.query('INSERT INTO authors (name) VALUES ($1) RETURNING id', [authorName]);
      authorId = authorResult.rows[0].id;
      console.log(`Created author: ${authorName}`);
    }

    // Insert quote
    const quoteResult = await client.query(
      'INSERT INTO quotes (body, author_id, source) VALUES ($1, $2, $3) RETURNING id',
      [quote.text, authorId, quote.source]
    );
    const quoteId = quoteResult.rows[0].id;
    console.log(`Inserted quote: "${quote.text.substring(0, 20)}..."`);

    // Handle tags
    for (const tagName of quote.tags) {
      let tagId: string;
      let tagResult = await client.query('SELECT id FROM tags WHERE name = $1', [tagName]);
      if (tagResult.rows.length > 0) {
        tagId = tagResult.rows[0].id;
      } else {
        tagResult = await client.query('INSERT INTO tags (name) VALUES ($1) RETURNING id', [tagName]);
        tagId = tagResult.rows[0].id;
        console.log(`Created tag: ${tagName}`);
      }

      // Insert into quote_tags
      await client.query('INSERT INTO quote_tags (quote_id, tag_id) VALUES ($1, $2)', [quoteId, tagId]);
    }
  }

  await client.release();
}

importQuotes().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
