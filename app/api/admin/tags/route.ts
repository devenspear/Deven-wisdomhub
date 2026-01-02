import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT
        t.id,
        t.name,
        COUNT(qt.quote_id)::int as "quoteCount"
      FROM tags t
      LEFT JOIN quote_tags qt ON t.id = qt.tag_id
      GROUP BY t.id
      ORDER BY t.name
    `;

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
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
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO tags (name)
      VALUES (${name.toLowerCase().trim()})
      RETURNING id, name
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create tag:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Tag already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
