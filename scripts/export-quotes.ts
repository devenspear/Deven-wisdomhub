/**
 * export-quotes.ts — Export all quotes from Postgres to data/quotes.json
 *
 * Postgres is the single source of truth. This script:
 *   1. Reads existing quotes.json to preserve author_provided and notes metadata
 *   2. Queries all quotes from the database (with authors and tags)
 *   3. Matches existing JSON entries by text (case-insensitive, trimmed)
 *   4. Writes the merged result back to data/quotes.json
 *   5. With --markdown flag, also regenerates wisdom_hub_quotes.md
 *
 * Usage:
 *   pnpm export-quotes          # JSON only
 *   pnpm export-quotes:md       # JSON + Markdown
 */

import { db } from '@vercel/postgres';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface JsonQuote {
  id: string;
  text: string;
  author_provided: string | null;
  author_actual: string;
  source: string;
  tags: string[];
  notes?: string;
}

interface DbRow {
  body: string;
  author_name: string;
  source: string | null;
  created_at: Date;
  tags: string[];
}

// ── Normalize text for matching ──────────────────────────────────────────────

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

// ── Query all quotes from Postgres ───────────────────────────────────────────

async function fetchDbQuotes(): Promise<DbRow[]> {
  const client = await db.connect();
  try {
    const { rows } = await client.query(`
      SELECT
        q.body,
        a.name AS author_name,
        q.source,
        q.created_at,
        COALESCE(
          array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
          '{}'
        ) AS tags
      FROM quotes q
      LEFT JOIN authors a ON a.id = q.author_id
      LEFT JOIN quote_tags qt ON qt.quote_id = q.id
      LEFT JOIN tags t ON t.id = qt.tag_id
      GROUP BY q.id, q.body, a.name, q.source, q.created_at
      ORDER BY q.created_at ASC
    `);
    return rows;
  } finally {
    client.release();
  }
}

// ── Build merged JSON ────────────────────────────────────────────────────────

function mergeQuotes(dbRows: DbRow[], existingJson: JsonQuote[]): JsonQuote[] {
  // Index existing JSON by normalized text for O(1) lookup
  const jsonByText = new Map<string, JsonQuote>();
  for (const jq of existingJson) {
    jsonByText.set(normalize(jq.text), jq);
  }

  const merged: JsonQuote[] = [];
  const newQuotes: string[] = [];

  for (let i = 0; i < dbRows.length; i++) {
    const row = dbRows[i];
    const id = `q-${String(i + 1).padStart(3, '0')}`;
    const existing = jsonByText.get(normalize(row.body));

    if (existing) {
      // Preserve author_provided and notes from the original JSON
      merged.push({
        id,
        text: row.body,
        author_provided: existing.author_provided,
        author_actual: row.author_name || 'Anonymous',
        source: row.source || '',
        tags: row.tags,
        ...(existing.notes ? { notes: existing.notes } : {}),
      });
    } else {
      // New quote — only exists in DB
      merged.push({
        id,
        text: row.body,
        author_provided: null,
        author_actual: row.author_name || 'Anonymous',
        source: row.source || '',
        tags: row.tags,
      });
      newQuotes.push(`  ${id}: "${row.body.substring(0, 60)}..." — ${row.author_name}`);
    }
  }

  // Print summary
  console.log(`\nTotal quotes exported: ${merged.length}`);
  console.log(`Matched from existing JSON: ${merged.length - newQuotes.length}`);
  console.log(`New (DB-only) quotes: ${newQuotes.length}`);
  if (newQuotes.length > 0) {
    console.log('\nNew quotes:');
    newQuotes.forEach((q) => console.log(q));
  }

  return merged;
}

// ── Markdown generation ──────────────────────────────────────────────────────

function generateMarkdown(quotes: JsonQuote[]): string {
  const lines: string[] = [];

  // Separate quotes by category
  const devenQuotes = quotes.filter((q) => q.author_actual === 'Deven');
  const anonymousAuthors = new Set(['Anonymous', 'Unknown']);
  const anonQuotes = quotes.filter(
    (q) => anonymousAuthors.has(q.author_actual) && q.author_actual !== 'Deven'
  );
  const namedQuotes = quotes.filter(
    (q) => !anonymousAuthors.has(q.author_actual) && q.author_actual !== 'Deven'
  );

  // Group named quotes by author
  const byAuthor = new Map<string, JsonQuote[]>();
  for (const q of namedQuotes) {
    const list = byAuthor.get(q.author_actual) || [];
    list.push(q);
    byAuthor.set(q.author_actual, list);
  }
  const sortedAuthors = [...byAuthor.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  // Count stats
  const withSource = quotes.filter((q) => q.source && q.source.length > 0).length;
  const withNotes = quotes.filter((q) => q.notes).length;

  // ── Header ──
  lines.push(`# DEVEN'S WISDOM HUB: ${quotes.length} Curated Quotes (20-Year Collection)`);
  lines.push('');
  lines.push(
    `> A personal collection gathered over two decades from books, interviews, and diverse sources.`
  );
  lines.push(
    `> Live at [nlight10.me](https://nlight10.me/) | ${quotes.length} quotes | ${sortedAuthors.length} sources | 20 years`
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Personal affirmations ──
  lines.push('## PERSONAL AFFIRMATIONS (Deven)');
  lines.push('');
  for (const q of devenQuotes) {
    const src = q.source ? ` | Source: ${q.source}` : '';
    const tags = q.tags.map((t) => `#${t}`).join(' ');
    lines.push(`- "${q.text}"${src} | ${tags}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Quotes by author ──
  lines.push('## QUOTES BY AUTHOR');
  lines.push('');

  for (const author of sortedAuthors) {
    const authorQuotes = byAuthor.get(author)!;
    lines.push(`### ${author}`);
    for (const q of authorQuotes) {
      let line = `- "${q.text}"`;
      if (q.source) line += ` | Source: ${q.source}`;
      if (q.notes) line += ` | *${q.notes}*`;
      // Show attribution note if author_provided differs from author_actual
      if (
        q.author_provided &&
        q.author_provided !== q.author_actual &&
        !q.notes
      ) {
        // Check for common patterns
        if (q.author_actual.includes('(Attributed)')) {
          line += ` | *(Attributed)*`;
        } else if (q.author_actual.includes('(Spurious)')) {
          line += ` | *(Considered spurious/misattributed)*`;
        } else if (q.author_actual.includes('(Concept)')) {
          line += ` | *(Concept)*`;
        } else if (q.author_actual.includes('(Adaptation)')) {
          const baseAuthor = q.author_actual.replace(' (Adaptation)', '');
          line += ` | *(Popularized by ${q.author_provided})*`;
        }
        // If the author_provided is a character name (like Yoda → George Lucas)
        if (
          q.author_provided === 'Yoda' ||
          q.author_provided === 'Ted Lasso' ||
          q.author_provided === 'Socrates'
        ) {
          if (q.author_provided === 'Yoda') {
            line += ` *(spoken by Yoda)*`;
          }
        }
      }
      const tags = q.tags.map((t) => `#${t}`).join(' ');
      line += ` | ${tags}`;
      lines.push(line);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // ── Anonymous section ──
  lines.push('## ANONYMOUS / UNATTRIBUTED');
  lines.push('');
  for (const q of anonQuotes) {
    let line = `- "${q.text}"`;
    if (q.source) line += ` | Source: ${q.source}`;
    if (q.notes) line += ` | *${q.notes}*`;
    if (
      q.author_provided &&
      q.author_provided !== 'Anonymous' &&
      q.author_provided !== q.author_actual &&
      !q.notes
    ) {
      line += ` | *(Often attributed to ${q.author_provided})*`;
    }
    const tags = q.tags.map((t) => `#${t}`).join(' ');
    line += ` | ${tags}`;
    lines.push(line);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Collection stats ──
  lines.push('## COLLECTION STATS');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total quotes | ${quotes.length} |`);
  lines.push(`| Personal affirmations (Deven) | ${devenQuotes.length} |`);
  lines.push(`| Named authors | ${sortedAuthors.length} |`);
  lines.push(`| Anonymous/unattributed | ${anonQuotes.length} |`);
  lines.push(`| Quotes with source/book | ${withSource} |`);
  lines.push(`| Quotes with attribution notes | ${withNotes} |`);
  lines.push('');

  // ── Most represented authors ──
  const authorCounts: [string, number][] = [
    ['Anonymous / Unattributed', anonQuotes.length],
    ...sortedAuthors.map((a) => [a, byAuthor.get(a)!.length] as [string, number]),
    ['Deven (Personal)', devenQuotes.length],
  ];
  authorCounts.sort((a, b) => b[1] - a[1]);
  const topAuthors = authorCounts.filter((a) => a[1] >= 2);

  lines.push('### Most Represented Authors');
  lines.push('| Author | Quotes |');
  lines.push('|--------|--------|');
  for (const [name, count] of topAuthors) {
    lines.push(`| ${name} | ${count} |`);
  }
  lines.push('');

  // ── Top tags ──
  const tagCounts = new Map<string, number>();
  for (const q of quotes) {
    for (const t of q.tags) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([t]) => `\`#${t}\``);

  lines.push('### Top Tags');
  lines.push(topTags.join(' '));
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Footer ──
  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  lines.push(`*Exported from [Deven's Wisdom Hub](https://nlight10.me/) — ${monthYear}*`);
  lines.push(`*Source data: Postgres database (${quotes.length} entries)*`);

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const generateMd = process.argv.includes('--markdown');

  console.log('Fetching quotes from Postgres...');
  const dbRows = await fetchDbQuotes();
  console.log(`Found ${dbRows.length} quotes in database.`);

  // Read existing JSON for metadata preservation
  const jsonPath = path.join(process.cwd(), 'data', 'quotes.json');
  let existingJson: JsonQuote[] = [];
  try {
    const raw = await fs.readFile(jsonPath, 'utf-8');
    existingJson = JSON.parse(raw);
    console.log(`Loaded ${existingJson.length} quotes from existing quotes.json`);
  } catch {
    console.log('No existing quotes.json found — starting fresh.');
  }

  // Merge
  const merged = mergeQuotes(dbRows, existingJson);

  // Write JSON
  await fs.writeFile(jsonPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`\nWrote ${merged.length} quotes to data/quotes.json`);

  // Optionally write Markdown
  if (generateMd) {
    const mdPath = path.join(process.cwd(), 'wisdom_hub_quotes.md');
    const md = generateMarkdown(merged);
    await fs.writeFile(mdPath, md + '\n');
    console.log(`Wrote wisdom_hub_quotes.md (${merged.length} quotes)`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
