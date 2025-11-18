import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        t.name,
        COUNT(q.id) as quote_count
      FROM tags t
      JOIN quote_tags qt ON t.id = qt.tag_id
      JOIN quotes q ON qt.quote_id = q.id
      GROUP BY t.name
      ORDER BY t.name
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
