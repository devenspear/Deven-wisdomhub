import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        a.name,
        COUNT(q.id) as quote_count
      FROM authors a
      JOIN quotes q ON a.id = q.author_id
      GROUP BY a.name
      ORDER BY a.name
    `;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
