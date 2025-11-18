import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        q.id,
        q.body as text,
        a.name as "authorActual",
        q.source,
        ARRAY_AGG(t.name) as tags
      FROM quotes q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN quote_tags qt ON q.id = qt.quote_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      GROUP BY q.id, a.name
      ORDER BY RANDOM()
      LIMIT 1;
    `;
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
