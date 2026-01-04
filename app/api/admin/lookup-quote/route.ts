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

    const prompt = `You are an expert on famous quotes, sayings, proverbs, and historical statements from all cultures, time periods, and sources worldwide.

The user has entered this text: "${partial.trim()}"

Your task is to identify this quote and provide complete information. This could be from:
- Literature (books, plays, poems)
- Political speeches and slogans
- Historical figures and leaders
- Philosophy and religious texts
- Movies, TV shows, songs
- Proverbs and traditional sayings
- Scientific or academic works

Instructions:
1. Identify the quote - even if partially remembered or paraphrased
2. Provide the most accurate/complete version of the quote
3. Identify the author or source
4. Note the original context (speech, book, campaign, etc.)
5. Suggest 3-5 relevant tags

Existing tags to prefer when applicable: ${tagList.join(', ')}

IMPORTANT GUIDELINES:
- Be helpful - if the text resembles a known quote, identify it even if wording differs slightly
- Include political, historical, and controversial quotes - this is for educational/reference purposes
- For quotes with complex history (misattributions, variations), note this in the message field
- Set confidence based on how well the input matches the known quote

Respond with ONLY a JSON object:
{
  "found": true,
  "text": "The complete, accurate quote text",
  "authorName": "Author's full name",
  "source": "Original source (book, speech, campaign name, year)",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": "high" or "medium" or "low",
  "message": "Historical context or notes about the quote"
}

Only respond with {"found": false, "message": "reason"} if the text truly doesn't match any known quote, saying, or proverb.`;

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
