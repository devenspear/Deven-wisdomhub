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
        a.id,
        a.name,
        a.bio,
        a.image_url as "imageUrl",
        COUNT(q.id)::int as "quoteCount"
      FROM authors a
      LEFT JOIN quotes q ON a.id = q.author_id
      GROUP BY a.id
      ORDER BY a.name
    `;

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch authors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authors' },
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
    const { name, bio, imageUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO authors (name, bio, image_url)
      VALUES (${name}, ${bio || null}, ${imageUrl || null})
      RETURNING id, name, bio, image_url as "imageUrl"
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create author:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Author already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create author' },
      { status: 500 }
    );
  }
}
