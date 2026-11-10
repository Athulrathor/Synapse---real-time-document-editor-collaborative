"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DashboardSearchProps {
  placeholder?: string;
}

export function DashboardSearch({
  placeholder = "Search documents...",
}: DashboardSearchProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery) return;

    router.push(`/documents?q=${encodeURIComponent(searchQuery)}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      role="search"
      className="flex w-full items-center gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label="Search documents"
          className="h-10 pl-9 pr-9"
        />

        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
            onClick={() => setQuery("")}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <Button type="submit" size="default" className="shrink-0">
        <Search className="size-4 sm:mr-2" />
        <span className="hidden sm:inline">Search</span>
      </Button>
    </form>
  );
}