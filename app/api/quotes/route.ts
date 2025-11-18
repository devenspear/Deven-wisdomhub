import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const tags = searchParams.getAll('tags');
  const authors = searchParams.getAll('authors');

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (query) {
      whereClauses.push(`(q.body ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex})`);
      params.push(`%${query}%`);
      paramIndex++;
    }

    if (tags.length > 0) {
      const tagPlaceholders = tags.map(() => `$${paramIndex++}`);
      whereClauses.push(`t.name IN (${tagPlaceholders.join(',')})`);
      params.push(...tags);
    }

    if (authors.length > 0) {
      const authorPlaceholders = authors.map(() => `$${paramIndex++}`);
      whereClauses.push(`a.name IN (${authorPlaceholders.join(',')})`);
      params.push(...authors);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const queryString = `
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
      ${where}
      GROUP BY q.id, a.name
      ORDER BY q.created_at DESC
    `;

    const { rows } = await sql.query(queryString, params);

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
