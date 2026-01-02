import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await sql`
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
      WHERE q.id = ${id}
      GROUP BY q.id, a.id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { text, authorName, source, tags, isFavorite } = body;

    // Check if quote exists
    const existingQuote = await sql`
      SELECT id, author_id FROM quotes WHERE id = ${id}
    `;

    if (existingQuote.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Handle author change
    let authorId = existingQuote.rows[0].author_id;
    if (authorName) {
      let authorResult = await sql`
        SELECT id FROM authors WHERE name = ${authorName}
      `;

      if (authorResult.rows.length > 0) {
        authorId = authorResult.rows[0].id;
      } else {
        const newAuthor = await sql`
          INSERT INTO authors (name) VALUES (${authorName}) RETURNING id
        `;
        authorId = newAuthor.rows[0].id;
      }
    }

    // Update quote
    await sql`
      UPDATE quotes
      SET
        body = COALESCE(${text || null}, body),
        author_id = ${authorId},
        source = ${source !== undefined ? source : null},
        is_favorite = COALESCE(${isFavorite !== undefined ? isFavorite : null}, is_favorite)
      WHERE id = ${id}
    `;

    // Update tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      // Remove existing tags
      await sql`DELETE FROM quote_tags WHERE quote_id = ${id}`;

      // Add new tags
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
          INSERT INTO quote_tags (quote_id, tag_id) VALUES (${id}, ${tagId})
        `;
      }
    }

    // Fetch updated quote
    const updatedQuote = await sql`
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
      WHERE q.id = ${id}
      GROUP BY q.id, a.id
    `;

    return NextResponse.json(updatedQuote.rows[0]);
  } catch (error) {
    console.error('Failed to update quote:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if quote exists
    const existingQuote = await sql`
      SELECT id FROM quotes WHERE id = ${id}
    `;

    if (existingQuote.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Delete quote (quote_tags will be deleted via CASCADE)
    await sql`DELETE FROM quotes WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete quote:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}
