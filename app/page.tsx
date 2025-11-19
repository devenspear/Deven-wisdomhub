"use client";

import { useMemo, useState, useEffect } from "react";
import { ModeToggle } from "@/components/ui/ModeToggle";
import { Search, Copy, Check, BookOpen, Sparkles, RotateCcw, Info, X, Shuffle } from "lucide-react";

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
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`"${quote.text}" — ${quote.authorActual}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="group relative rounded-2xl bg-white/80 p-6 card-shadow surface-border dark:bg-slate-900/80 transition-all hover:translate-y-[-2px] animate-in fade-in zoom-in-95 duration-500">
      <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-xl leading-relaxed text-slate-900 dark:text-slate-50 font-serif">“{quote.text}”</p>
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
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-2 font-semibold text-white transition hover:translate-y-[-1px] hover:from-slate-600 hover:to-slate-700 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-500 dark:hover:to-slate-600"
        >
          <BookOpen className="h-4 w-4" />
          Reader mode
        </button>
      </div>
    </article>
  );
};

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
        <p className="text-2xl leading-relaxed text-slate-900 dark:text-slate-50 font-serif">“{quote.text}”</p>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (query) queryParams.append('query', query);
    selectedTags.forEach(t => queryParams.append('tags', t));
    selectedAuthors.forEach(a => queryParams.append('authors', a));

    fetch(`/api/quotes?${queryParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        // Shuffle quotes on load
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setQuotes(shuffled);
        setIsLoading(false);
      });
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

  const handleShuffle = () => {
    setQuotes(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50">
      {/* Compact Header */}
      <header className="border-b border-slate-200 bg-white/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/50 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="h-8 w-8 dark:hidden" />
                <img src="/logo-dark.png" alt="Logo" className="hidden h-8 w-8 dark:block" />
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Deven's Wisdom Hub
                  </h1>
                  <p className="text-base text-slate-600 dark:text-slate-400">
                    {quotes.length} quotes • {allAuthors.length} authors
                  </p>
                </div>
              </div>
              <div className="md:hidden">
                <ModeToggle />
              </div>
            </div>

            <div className="flex flex-1 items-center gap-3 md:max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search wisdom..."
                  className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-10 py-2 text-sm shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-700 dark:focus:ring-slate-800"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleShuffle}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Randomize quote order"
              >
                <Shuffle className="h-4 w-4" />
                Reshuffle
              </button>
              <button
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${isFiltersOpen ? "border-slate-900 bg-slate-900 text-white dark:border-slate-50 dark:bg-slate-50 dark:text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                <Sparkles className="h-4 w-4" />
                Filters
                {(selectedTags.length > 0 || selectedAuthors.length > 0) && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                    {selectedTags.length + selectedAuthors.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsAboutOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Info className="h-4 w-4" />
                About
              </button>
              <div className="hidden md:block">
                <ModeToggle />
              </div>
            </div>
          </div>

          {/* Collapsible Filters */}
          {isFiltersOpen && (
            <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Tags</h3>
                    {selectedTags.length > 0 && (
                      <button onClick={() => setSelectedTags([])} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300">Clear</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
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
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Authors</h3>
                    {selectedAuthors.length > 0 && (
                      <button onClick={() => setSelectedAuthors([])} className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300">Clear</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
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
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset all
                </button>
              </div>
            </div>
          )}

          {/* Active Filters Bar */}
          {(selectedTags.length > 0 || selectedAuthors.length > 0) && !isFiltersOpen && (
            <div className="mt-3 flex flex-wrap gap-2 overflow-x-auto pb-1 no-scrollbar">
              {selectedTags.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  #{tag} <span className="opacity-50">×</span>
                </button>
              ))}
              {selectedAuthors.map(author => (
                <button key={author} onClick={() => toggleAuthor(author)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  {author} <span className="opacity-50">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <section className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50 py-20 text-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">No quotes found</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try adjusting your search or filters.</p>
              <button onClick={clearFilters} className="mt-6 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Floating Action Button for Random Quote (Mobile) */}
      <button
        onClick={handleRandom}
        className="fixed bottom-6 right-6 z-20 rounded-full bg-slate-900 p-4 text-white shadow-xl transition hover:scale-105 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 md:hidden"
        title="Surprise me"
      >
        <Sparkles className="h-6 w-6" />
      </button>

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

      {/* About Modal */}
      {isAboutOpen && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur"
          onClick={() => setIsAboutOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAboutOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6">
              A Two-Decade Journey
            </h2>

            <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                What you're experiencing is more than a database—it's a curated collection of insights that have shaped my thinking over the past 20 years.
              </p>

              <p>
                These {quotes.length} quotes arrived through diverse channels: dog-eared books, saved blog posts, YouTube interviews, random websites, and serendipitous discoveries. Each one earned its place by offering a perspective worth remembering.
              </p>

              <p>
                This collection continues to grow. Whenever a new idea strikes with enough force to pause my day, it joins the archive.
              </p>

              <p className="font-medium text-slate-900 dark:text-slate-50">
                I hope these words spark the same sense of discovery and inspiration in you that they've brought to me.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}