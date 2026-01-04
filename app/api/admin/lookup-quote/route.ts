import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { generateContent } from '@/lib/gemini';

interface LookupResult {
  found: boolean;
  text?: string;
  authorName?: string;
  source?: string;
  tags?: string[];
  confidence?: 'high' | 'medium' | 'low';
  message?: string;
}

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { partial } = await request.json();

    if (!partial || partial.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please enter at least 10 characters of the quote' },
        { status: 400 }
      );
    }

    // Get existing tags for context
    const existingTags = await sql`
      SELECT name FROM tags ORDER BY name
    `;
    const tagList = existingTags.rows.map(t => t.name);

    const prompt = `You are a quote identification expert. Given a partial or full quote, identify the famous quote and provide complete information about it.

Partial quote provided: "${partial.trim()}"

Your task:
1. Identify what famous quote this is from
2. Provide the complete, accurate quote text
3. Identify the author
4. Identify the source (book, speech, play, movie, etc.) if known
5. Suggest 3-5 relevant tags for categorization

Existing tags in the system (prefer these when applicable): ${tagList.join(', ')}

IMPORTANT:
- Only identify quotes you are confident about
- The quote text should be the complete, accurate version
- If this doesn't match any famous quote you know, set found to false

Respond with ONLY a JSON object in this exact format, no other text:
{
  "found": true or false,
  "text": "The complete quote text",
  "authorName": "Author's full name",
  "source": "Book/Speech/Play title, year if known",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": "high" or "medium" or "low",
  "message": "Optional note about the quote (e.g., 'often misattributed' or 'from Act 3, Scene 1')"
}

If you cannot identify the quote, respond with:
{
  "found": false,
  "message": "Brief explanation of why the quote couldn't be identified"
}`;

    const response = await generateContent(prompt);

    // Parse the JSON response
    const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, '');
    let result: LookupResult;

    try {
      result = JSON.parse(cleanResponse);

      // Validate and clean the result
      if (result.found && result.text && result.authorName) {
        // Clean tags
        if (result.tags) {
          result.tags = result.tags
            .filter((tag): tag is string => typeof tag === 'string')
            .map(tag => tag.toLowerCase().trim())
            .filter(tag => tag.length > 0 && tag.length < 50)
            .slice(0, 5);
        } else {
          result.tags = [];
        }

        // Ensure source is a string or null
        if (typeof result.source !== 'string') {
          result.source = '';
        }
      }
    } catch {
      return NextResponse.json(
        {
          found: false,
          message: 'Failed to parse AI response. Please try again.'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to lookup quote:', error);
    return NextResponse.json(
      { error: 'Failed to lookup quote', found: false },
      { status: 500 }
    );
  }
}
