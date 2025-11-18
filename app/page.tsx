"use client";

import { useMemo, useState, useEffect } from "react";
import { ModeToggle } from "@/components/ui/ModeToggle";

export type Quote = {
  id: string;
  text: string;
  authorActual: string;
  source?: string;
  tags: string[];
};

export type Author = {
  name: string;
  quote_count: number;
};

export type Tag = {
  name: string;
  quote_count: number;
};


const Pill = ({
  label,
  selected,
  onClick,
  count,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`rounded-full border px-3 py-1 text-sm font-medium transition ${selected ? "border-slate-900 bg-slate-900 text-white shadow dark:border-slate-50 dark:bg-slate-50 dark:text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-50"}`}
  >
    {label}
    {typeof count === "number" && <span className="ml-1 text-xs opacity-80">{count}</span>}
  </button>
);

const QuoteCard = ({ quote, onOpen, onTagToggle }: {
  quote: Quote;
  onOpen: () => void;
  onTagToggle: (tag: string) => void;
}) => (
  <article className="rounded-2xl bg-white/80 p-6 card-shadow surface-border dark:bg-slate-900/80">
    <p className="text-lg leading-relaxed text-slate-900 dark:text-slate-50">“{quote.text}”</p>
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
        {quote.authorActual || "Unknown"}
      </span>
      {quote.source && <span className="rounded-full bg-slate-50 px-3 py-1 dark:bg-slate-800/50">{quote.source}</span>}
    </div>
    {quote.tags.length > 0 && (
      <div className="mt-4 flex flex-wrap gap-2">
        {quote.tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagToggle(tag)}
            className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            #{tag}
          </button>
        ))}
      </div>
    )}
    <div className="mt-6 flex justify-between gap-3 text-sm">
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white transition hover:translate-y-[-1px] hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        Reader mode
      </button>
    </div>
  </article>
);

const ReaderModal = ({
  quote,
  onClose,
  onTagClick,
}: {
  quote: Quote;
  onClose: () => void;
  onTagClick: (tag: string) => void;
}) => {
  const [relatedByAuthor, setRelatedByAuthor] = useState<Quote[]>([]);
  const [relatedByTag, setRelatedByTag] = useState<Quote[]>([]);

  useEffect(() => {
    if (quote.authorActual) {
      fetch(`/api/quotes/related?author=${quote.authorActual}&excludeId=${quote.id}`)
        .then((res) => res.json())
        .then(setRelatedByAuthor);
    }
    if (quote.tags.length > 0) {
      const tagsQuery = quote.tags.map(t => `tags=${t}`).join('&');
      fetch(`/api/quotes/related?${tagsQuery}&excludeId=${quote.id}`)
        .then((res) => res.json())
        .then(setRelatedByTag);
    }
  }, [quote]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-950">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Close
        </button>
        <p className="text-2xl leading-relaxed text-slate-900 dark:text-slate-50">“{quote.text}”</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white dark:bg-slate-50 dark:text-slate-900">
            {quote.authorActual || "Unknown"}
          </span>
          {quote.source && <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{quote.source}</span>}
        </div>

        {quote.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {quote.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick(tag)}
                className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {relatedByAuthor.length > 0 && (
          <div className="mt-8 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              More from {quote.authorActual}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-400">
              {relatedByAuthor.map((q) => (
                <li key={q.id} className="leading-relaxed">
                  “{q.text}”
                </li>
              ))}
            </ul>
          </div>
        )}

        {relatedByTag.length > 0 && (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Related by tags</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-400">
              {relatedByTag.map((q) => (
                <li key={q.id} className="leading-relaxed">
                  “{q.text}” — {q.authorActual}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [allAuthors, setAllAuthors] = useState<Author[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (query) queryParams.append('query', query);
    selectedTags.forEach(t => queryParams.append('tags', t));
    selectedAuthors.forEach(a => queryParams.append('authors', a));

    fetch(`/api/quotes?${queryParams.toString()}`)
      .then(res => res.json())
      .then(setQuotes);
  }, [query, selectedTags, selectedAuthors]);

  useEffect(() => {
    fetch('/api/authors').then(res => res.json()).then(setAllAuthors);
    fetch('/api/tags').then(res => res.json()).then(setAllTags);
  }, []);


  const activeQuote = useMemo(
    () => quotes.find((quote) => quote.id === activeQuoteId) ?? null,
    [activeQuoteId, quotes],
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleAuthor = (author: string) => {
    setSelectedAuthors((prev) =>
      prev.includes(author) ? prev.filter((a) => a !== author) : [...prev, author],
    );
  };

  const handleRandom = () => {
    fetch('/api/quotes/random')
      .then(res => res.json())
      .then(quote => {
        if (quote) setActiveQuoteId(quote.id);
      });
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedTags([]);
    setSelectedAuthors([]);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Personal Wisdom Hub
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Curate, search, and read your private library of quotes.
            </h1>
            <p className="max-w-2xl text-slate-600 dark:text-slate-400">
              Filter by tags or authors, search across the full text, and open Reader
              Mode for contextual browsing.
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{quotes.length} quotes</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{allAuthors.length} authors</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{allTags.length} tags</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRandom}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white shadow transition hover:translate-y-[-1px] hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              ✨ Surprise me
            </button>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-50"
            >
              Reset filters
            </button>
            <ModeToggle />
          </div>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl bg-white p-6 card-shadow surface-border dark:bg-slate-900">
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Global search</label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search text, authors, tags..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-700 dark:focus:ring-slate-800"
              />

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tags (OR logic)</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{selectedTags.length} selected</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Pill
                      key={tag.name}
                      label={`#${tag.name}`}
                      count={tag.quote_count}
                      selected={selectedTags.includes(tag.name)}
                      onClick={() => toggleTag(tag.name)}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Authors</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{selectedAuthors.length} selected</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allAuthors.map((author) => (
                    <Pill
                      key={author.name}
                      label={author.name}
                      count={author.quote_count}
                      selected={selectedAuthors.includes(author.name)}
                      onClick={() => toggleAuthor(author.name)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 card-shadow surface-border dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Library pulse</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Matches</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{quotes.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">after filters & search</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Filters</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  {selectedTags.length + selectedAuthors.length + (query ? 1 : 0)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">active</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 col-span-2 dark:bg-slate-800/50">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick tips</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Use tags to broaden (OR) results quickly.</li>
                  <li>• Reader Mode links to author + tag neighbors.</li>
                  <li>• “Surprise me” respects current filters.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Quotes</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{quotes.length} result(s)</p>
          </div>
          {quotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
              No quotes match these filters. Try clearing a tag or searching a different term.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {quotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onOpen={() => setActiveQuoteId(quote.id)}
                  onTagToggle={toggleTag}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {activeQuote && (
        <ReaderModal
          quote={activeQuote}
          onClose={() => setActiveQuoteId(null)}
          onTagClick={(tag) => {
            toggleTag(tag);
            setActiveQuoteId(null);
          }}
        />
      )}
    </main>
  );
}