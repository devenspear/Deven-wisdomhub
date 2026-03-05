import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ')   // collapse whitespace
    .trim();
}

type MatchResult = {
  id: string;
  text: string;
  authorName: string;
  similarity: 'exact' | 'similar';
};

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return NextResponse.json(
        { error: 'Text must be at least 5 characters' },
        { status: 400 }
      );
    }

    const inputText = text.trim();
    const inputNormalized = normalizeText(inputText);
    const matches: MatchResult[] = [];

    // Tier 1: Exact match (case-insensitive)
    const exactResult = await sql`
      SELECT q.id, q.body, a.name as author_name
      FROM quotes q
      JOIN authors a ON q.author_id = a.id
      WHERE LOWER(q.body) = LOWER(${inputText})
    `;

    if (exactResult.rows.length > 0) {
      for (const row of exactResult.rows) {
        matches.push({
          id: row.id,
          text: row.body,
          authorName: row.author_name,
          similarity: 'exact',
        });
      }
      return NextResponse.json({ isDuplicate: true, matches });
    }

    // Tier 2: Normalized match (strip punctuation, collapse whitespace)
    const allQuotes = await sql`
      SELECT q.id, q.body, a.name as author_name
      FROM quotes q
      JOIN authors a ON q.author_id = a.id
    `;

    for (const row of allQuotes.rows) {
      const rowNormalized = normalizeText(row.body);
      if (rowNormalized === inputNormalized) {
        matches.push({
          id: row.id,
          text: row.body,
          authorName: row.author_name,
          similarity: 'exact',
        });
      }
    }

    if (matches.length > 0) {
      return NextResponse.json({ isDuplicate: true, matches });
    }

    // Tier 3: Substring containment (either direction)
    const inputLower = inputText.toLowerCase();
    for (const row of allQuotes.rows) {
      const rowLower = row.body.toLowerCase();
      if (rowLower.includes(inputLower) || inputLower.includes(rowLower)) {
        matches.push({
          id: row.id,
          text: row.body,
          authorName: row.author_name,
          similarity: 'similar',
        });
      }
    }

    return NextResponse.json({
      isDuplicate: matches.length > 0,
      matches,
    });
  } catch (error) {
    console.error('Failed to check for duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
