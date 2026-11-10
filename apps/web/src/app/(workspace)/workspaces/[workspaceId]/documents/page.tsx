"use client"

import { useState } from "react";
import { useParams } from "next/navigation";

import DocumentToolbar from "@/components/documents/documentPage/document-toolbar";
import DocumentsHeader from "@/components/documents/documentPage/document-header";
import DocumentListing from "@/components/documents/documentPage/document-listing";
import { useDebounce } from "@/hooks/use-debounce";

export default function DocumentsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<string>("ALL");
  const [sort, setSort] = useState<string>("UPDATED_DESC");

  const debouncedSearch = useDebounce(search,300);

  return (
    <section className="w-full space-y-6">
      <DocumentsHeader workspaceId={workspaceId} />

      <DocumentToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        sort={sort}
        onSortChange={setSort}
      />

      <DocumentListing
        workspaceId={workspaceId}
        search={debouncedSearch}
        status={status}
        sort={sort}
      />
    </section>
  );
}
