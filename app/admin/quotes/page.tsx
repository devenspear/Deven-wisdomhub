"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Star,
  StarOff,
  Sparkles,
  Loader2,
} from "lucide-react";

type Tag = {
  id: string;
  name: string;
};

type Quote = {
  id: string;
  text: string;
  source: string | null;
  createdAt: string;
  isFavorite: boolean;
  authorId: string;
  authorName: string;
  tags: Tag[];
};

type QuoteFormData = {
  text: string;
  authorName: string;
  source: string;
  tags: string[];
  isFavorite: boolean;
};

const ITEMS_PER_PAGE = 20;

export default function AdminQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>({
    text: "",
    authorName: "",
    source: "",
    tags: [],
    isFavorite: false,
  });
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allAuthors, setAllAuthors] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef<string>("");

  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: (page * ITEMS_PER_PAGE).toString(),
      });
      if (query) params.set("query", query);

      const res = await fetch(`/api/admin/quotes?${params}`);
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      const data = await res.json();
      setQuotes(data.quotes || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, query, router]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [tagsRes, authorsRes] = await Promise.all([
        fetch("/api/tags"),
        fetch("/api/authors"),
      ]);
      const tagsData = await tagsRes.json();
      const authorsData = await authorsRes.json();
      setAllTags(tagsData.map((t: { name: string }) => t.name));
      setAllAuthors(authorsData.map((a: { name: string }) => a.name));
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Auto-suggest tags when quote text changes
  useEffect(() => {
    // Only run for new quotes (not editing) and when modal is open
    if (!isModalOpen || editingQuote) {
      return;
    }

    const text = formData.text.trim();

    // Skip if text is too short or hasn't changed meaningfully
    if (text.length < 20 || text === lastTextRef.current) {
      return;
    }

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the API call (1.5 seconds after typing stops)
    debounceRef.current = setTimeout(async () => {
      lastTextRef.current = text;
      setIsLoadingSuggestions(true);

      try {
        const res = await fetch("/api/admin/suggest-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            authorName: formData.authorName,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Filter out tags already added
          const newSuggestions = (data.tags || []).filter(
            (tag: string) => !formData.tags.includes(tag)
          );
          setSuggestedTags(newSuggestions);
        }
      } catch (error) {
        console.error("Failed to get tag suggestions:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 1500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [formData.text, formData.authorName, formData.tags, isModalOpen, editingQuote]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  };

  const openAddModal = () => {
    setEditingQuote(null);
    setFormData({
      text: "",
      authorName: "",
      source: "",
      tags: [],
      isFavorite: false,
    });
    setTagInput("");
    setSuggestedTags([]);
    lastTextRef.current = "";
    setIsModalOpen(true);
  };

  const openEditModal = (quote: Quote) => {
    setEditingQuote(quote);
    setFormData({
      text: quote.text,
      authorName: quote.authorName,
      source: quote.source || "",
      tags: quote.tags.map((t) => t.name),
      isFavorite: quote.isFavorite,
    });
    setTagInput("");
    setIsModalOpen(true);
  };

  const openDeleteModal = (quote: Quote) => {
    setDeletingQuote(quote);
    setIsDeleteModalOpen(true);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleSave = async () => {
    if (!formData.text.trim() || !formData.authorName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const url = editingQuote
        ? `/api/admin/quotes/${editingQuote.id}`
        : "/api/admin/quotes";
      const method = editingQuote ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchQuotes();
        fetchMetadata();
      } else {
        console.error("Failed to save quote");
      }
    } catch (error) {
      console.error("Failed to save quote:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingQuote) return;

    try {
      const res = await fetch(`/api/admin/quotes/${deletingQuote.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setDeletingQuote(null);
        fetchQuotes();
      } else {
        console.error("Failed to delete quote");
      }
    } catch (error) {
      console.error("Failed to delete quote:", error);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Quotes Manager
              </h1>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {total} quotes
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">View Site</span>
              </a>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Quote</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search quotes or authors..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:border-slate-600 dark:focus:ring-slate-700"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 py-16 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
              No quotes found
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {query ? "Try adjusting your search." : "Add your first quote to get started."}
            </p>
            {!query && (
              <button
                onClick={openAddModal}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                Add Quote
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-slate-50 line-clamp-2 font-serif">
                        "{quote.text}"
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {quote.authorName}
                        </span>
                        {quote.source && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {quote.source}
                            </span>
                          </>
                        )}
                        {quote.isFavorite && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      {quote.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {quote.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            >
                              #{tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openEditModal(quote)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(quote)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {page * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min((page + 1) * ITEMS_PER_PAGE, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {editingQuote ? "Edit Quote" : "Add New Quote"}
            </h2>

            <div className="mt-6 space-y-4">
              {/* Quote text */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Quote Text *
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) =>
                    setFormData({ ...formData, text: e.target.value })
                  }
                  rows={4}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  placeholder="Enter the quote..."
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Author *
                </label>
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) =>
                    setFormData({ ...formData, authorName: e.target.value })
                  }
                  list="authors-list"
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  placeholder="Author name"
                />
                <datalist id="authors-list">
                  {allAuthors.map((author) => (
                    <option key={author} value={author} />
                  ))}
                </datalist>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Source
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  placeholder="Book, article, speech, etc."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tags
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    list="tags-list"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                    placeholder="Add a tag..."
                  />
                  <datalist id="tags-list">
                    {allTags
                      .filter((t) => !formData.tags.includes(t))
                      .map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* AI Suggested Tags */}
                {!editingQuote && (isLoadingSuggestions || suggestedTags.length > 0) && (
                  <div className="mt-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-3 dark:from-purple-900/20 dark:to-blue-900/20">
                    <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                      {isLoadingSuggestions ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          AI analyzing quote...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          AI suggested tags (click to add)
                        </>
                      )}
                    </div>
                    {suggestedTags.length > 0 && !isLoadingSuggestions && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {suggestedTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, tags: [...formData.tags, tag] });
                              setSuggestedTags(suggestedTags.filter((t) => t !== tag));
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-purple-700 shadow-sm transition hover:bg-purple-100 dark:bg-slate-800 dark:text-purple-300 dark:hover:bg-slate-700"
                          >
                            <Plus className="h-3 w-3" />
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Favorite */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, isFavorite: !formData.isFavorite })
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    formData.isFavorite
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {formData.isFavorite ? (
                    <>
                      <Star className="h-4 w-4 fill-current" />
                      Favorited
                    </>
                  ) : (
                    <>
                      <StarOff className="h-4 w-4" />
                      Mark as Favorite
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  isSaving || !formData.text.trim() || !formData.authorName.trim()
                }
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-slate-900 dark:border-t-transparent" />
                ) : null}
                {editingQuote ? "Update Quote" : "Add Quote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingQuote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              Delete Quote
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this quote? This action cannot be
              undone.
            </p>
            <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300 line-clamp-3 font-serif">
              "{deletingQuote.text}"
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
