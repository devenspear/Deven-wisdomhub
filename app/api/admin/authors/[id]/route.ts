import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

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
    const { name, bio, imageUrl } = body;

    const result = await sql`
      UPDATE authors
      SET
        name = COALESCE(${name || null}, name),
        bio = ${bio !== undefined ? bio : null},
        image_url = ${imageUrl !== undefined ? imageUrl : null}
      WHERE id = ${id}
      RETURNING id, name, bio, image_url as "imageUrl"
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update author:', error);
    return NextResponse.json(
      { error: 'Failed to update author' },
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
    // Check if author has quotes
    const quotesCheck = await sql`
      SELECT COUNT(*)::int as count FROM quotes WHERE author_id = ${id}
    `;

    if (quotesCheck.rows[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete author with existing quotes' },
        { status: 400 }
      );
    }

    await sql`DELETE FROM authors WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete author:', error);
    return NextResponse.json(
      { error: 'Failed to delete author' },
      { status: 500 }
    );
  }
}
