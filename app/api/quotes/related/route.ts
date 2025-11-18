import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const author = searchParams.get('author');
  const tags = searchParams.getAll('tags');
  const excludeId = searchParams.get('excludeId');

  try {
    if (author) {
      const { rows } = await sql`
        SELECT
          q.id,
          q.body as text,
          a.name as "authorActual"
        FROM quotes q
        JOIN authors a ON q.author_id = a.id
        WHERE a.name = ${author} AND q.id != ${excludeId}
        LIMIT 3;
      `;
      return NextResponse.json(rows);
    }

    if (tags.length > 0) {
      // Convert array to PostgreSQL array literal format: {tag1,tag2,tag3}
      const tagList = `{${tags.join(',')}}`;
      const { rows } = await sql`
        SELECT
          q.id,
          q.body as text,
          a.name as "authorActual"
        FROM quotes q
        JOIN authors a ON q.author_id = a.id
        JOIN quote_tags qt ON q.id = qt.quote_id
        JOIN tags t ON qt.tag_id = t.id
        WHERE t.name = ANY(${tagList}::text[]) AND q.id != ${excludeId}
        GROUP BY q.id, a.name
        LIMIT 4;
      `;
      return NextResponse.json(rows);
    }

    return NextResponse.json({ error: 'Missing author or tags parameter' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
