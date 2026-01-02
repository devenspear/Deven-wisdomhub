import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { generateContent } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text, authorName } = await request.json();

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ tags: [] });
    }

    // Get existing tags for context
    const existingTags = await sql`
      SELECT name FROM tags ORDER BY name
    `;
    const tagList = existingTags.rows.map(t => t.name);

    const prompt = `Analyze this quote and suggest 2-5 relevant tags for categorization.

Quote: "${text}"
${authorName ? `Author: ${authorName}` : ''}

Existing tags in the system (prefer these when applicable): ${tagList.join(', ')}

Rules:
- Return ONLY a JSON array of lowercase tag strings, nothing else
- Tags should be single words or short phrases (1-3 words max)
- Focus on themes, topics, emotions, or concepts
- Prefer existing tags when they fit
- If suggesting new tags, keep them general and reusable
- Examples of good tags: wisdom, leadership, perseverance, mindfulness, creativity, success, love, courage

Response format (JSON array only):
["tag1", "tag2", "tag3"]`;

    const response = await generateContent(prompt);

    // Parse the JSON response
    const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, '');
    let suggestedTags: string[] = [];

    try {
      suggestedTags = JSON.parse(cleanResponse);
      // Validate and clean tags
      suggestedTags = suggestedTags
        .filter((tag): tag is string => typeof tag === 'string')
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => tag.length > 0 && tag.length < 50)
        .slice(0, 5);
    } catch {
      // If JSON parsing fails, try to extract tags from text
      const matches = cleanResponse.match(/["']([^"']+)["']/g);
      if (matches) {
        suggestedTags = matches
          .map(m => m.replace(/["']/g, '').toLowerCase().trim())
          .filter(tag => tag.length > 0 && tag.length < 50)
          .slice(0, 5);
      }
    }

    return NextResponse.json({ tags: suggestedTags });
  } catch (error) {
    console.error('Failed to suggest tags:', error);
    return NextResponse.json(
      { error: 'Failed to suggest tags', tags: [] },
      { status: 500 }
    );
  }
}
