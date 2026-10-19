
"use client";

import { useState } from "react";
import {
  FileText,
  FilePlus2,
  Search,
  LayoutGrid,
  List,
  Clock3,
  MoreHorizontal,
  Star,
} from "lucide-react";

type DocumentItem = {
  id: string;
  title: string;
  workspace: string;
  updatedAt: string;
  starred: boolean;
};

const initialDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    title: "Product Requirements Document",
    workspace: "Product Team",
    updatedAt: "Edited 2 hours ago",
    starred: true,
  },
  {
    id: "doc-2",
    title: "Engineering Roadmap",
    workspace: "Engineering",
    updatedAt: "Edited yesterday",
    starred: false,
  },
  {
    id: "doc-3",
    title: "Meeting Notes",
    workspace: "Product Team",
    updatedAt: "Edited 3 days ago",
    starred: false,
  },
  {
    id: "doc-4",
    title: "API Documentation",
    workspace: "Engineering",
    updatedAt: "Edited last week",
    starred: true,
  },
];

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [documents, setDocuments] = useState(initialDocuments);

  const filteredDocuments = documents.filter((document) =>
    `${document.title} ${document.workspace}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function toggleStar(id: string) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id
          ? { ...document, starred: !document.starred }
          : document,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-5 sm:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Your workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Documents
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find and manage all your documents in one place.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          onClick={() => alert("Document creation will be connected next.")}
        >
          <FilePlus2 className="size-4" />
          New document
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents..."
            aria-label="Search documents"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredDocuments.length} documents
          </span>
          <div className="ml-auto flex rounded-xl border border-border p-1">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={`rounded-lg p-2 transition ${
                view === "grid"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`rounded-lg p-2 transition ${
                view === "list"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {filteredDocuments.length > 0 ? (
        <div
          className={
            view === "grid"
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredDocuments.map((document) => (
            <article
              key={document.id}
              className={`group rounded-2xl border border-border bg-card transition hover:border-primary/30 hover:shadow-sm ${
                view === "list" ? "flex items-center gap-4 p-4" : "p-5"
              }`}
            >
              <div
                className={`flex items-center justify-center rounded-xl bg-primary/10 text-primary ${
                  view === "list" ? "size-10 shrink-0" : "mb-5 size-11"
                }`}
              >
                <FileText className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium">{document.title}</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {document.workspace}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {document.updatedAt}
                </p>
              </div>

              <div className={`flex items-center gap-1 ${view === "grid" ? "mt-4 border-t border-border pt-3" : ""}`}>
                <button
                  type="button"
                  aria-label={
                    document.starred ? "Remove star" : "Star document"
                  }
                  aria-pressed={document.starred}
                  onClick={() => toggleStar(document.id)}
                  className={`rounded-lg p-2 transition hover:bg-accent ${
                    document.starred
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  }`}
                >
                  <Star
                    className="size-4"
                    fill={document.starred ? "currentColor" : "none"}
                  />
                </button>
                <button
                  type="button"
                  aria-label={`More actions for ${document.title}`}
                  onClick={() => alert("More document actions will be added later.")}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">No documents found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try a different search term to find the document you need.
          </p>
        </div>
      )}
    </div>
  );
}
