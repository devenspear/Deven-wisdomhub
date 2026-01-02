import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let whereClauses: string[] = [];
    let params: (string | number)[] = [];
    let paramIndex = 1;

    if (query) {
      whereClauses.push(`(q.body ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex})`);
      params.push(`%${query}%`);
      paramIndex++;
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(DISTINCT q.id) as total
      FROM quotes q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN quote_tags qt ON q.id = qt.quote_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      ${where}
    `;

    const dataQuery = `
      SELECT
        q.id,
        q.body as text,
        q.source,
        q.created_at as "createdAt",
        q.is_favorite as "isFavorite",
        a.id as "authorId",
        a.name as "authorName",
        COALESCE(
          ARRAY_AGG(
            DISTINCT jsonb_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL),
          ARRAY[]::jsonb[]
        ) as tags
      FROM quotes q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN quote_tags qt ON q.id = qt.quote_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      ${where}
      GROUP BY q.id, a.id
      ORDER BY q.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      sql.query(countQuery, params.slice(0, -2)),
      sql.query(dataQuery, params),
    ]);

    return NextResponse.json({
      quotes: dataResult.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { text, authorName, source, tags, isFavorite } = body;

    if (!text || !authorName) {
      return NextResponse.json(
        { error: 'Text and author name are required' },
        { status: 400 }
      );
    }

    // Find or create author
    let authorResult = await sql`
      SELECT id FROM authors WHERE name = ${authorName}
    `;

    let authorId: string;
    if (authorResult.rows.length > 0) {
      authorId = authorResult.rows[0].id;
    } else {
      const newAuthor = await sql`
        INSERT INTO authors (name) VALUES (${authorName}) RETURNING id
      `;
      authorId = newAuthor.rows[0].id;
    }

    // Insert quote
    const quoteResult = await sql`
      INSERT INTO quotes (body, author_id, source, is_favorite)
      VALUES (${text}, ${authorId}, ${source || null}, ${isFavorite || false})
      RETURNING id, body, source, created_at, is_favorite
    `;

    const quoteId = quoteResult.rows[0].id;

    // Handle tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        let tagResult = await sql`
          SELECT id FROM tags WHERE name = ${tagName}
        `;

        let tagId: string;
        if (tagResult.rows.length > 0) {
          tagId = tagResult.rows[0].id;
        } else {
          const newTag = await sql`
            INSERT INTO tags (name) VALUES (${tagName}) RETURNING id
          `;
          tagId = newTag.rows[0].id;
        }

        await sql`
          INSERT INTO quote_tags (quote_id, tag_id) VALUES (${quoteId}, ${tagId})
        `;
      }
    }

    // Fetch the complete quote with tags
    const completeQuote = await sql`
      SELECT
        q.id,
        q.body as text,
        q.source,
        q.created_at as "createdAt",
        q.is_favorite as "isFavorite",
        a.id as "authorId",
        a.name as "authorName",
        COALESCE(
          ARRAY_AGG(
            DISTINCT jsonb_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL),
          ARRAY[]::jsonb[]
        ) as tags
      FROM quotes q
      JOIN authors a ON q.author_id = a.id
      LEFT JOIN quote_tags qt ON q.id = qt.quote_id
      LEFT JOIN tags t ON qt.tag_id = t.id
      WHERE q.id = ${quoteId}
      GROUP BY q.id, a.id
    `;

    return NextResponse.json(completeQuote.rows[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
