"use client";

import Link from "next/link";
import {
  ChevronRight,
  FileText,
  MoreHorizontal,
  Share2,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Collaborator {
  id: string;
  name: string;
  avatar?: string | null;
}

interface DocumentHeaderProps {
  workspaceName: string;
  workspaceId: string;
  documentTitle: string;
  isFavorite: boolean;
  collaborators?: Collaborator[];
  onShare?: () => void;
  onToggleFavorite?: () => void;
  onRestore?: () => void;
  onMoveToTrash?: () => void;
}

export function DocumentHeader({
  workspaceName,
  workspaceId,
  documentTitle,
  collaborators = [],
  onShare,
  onRestore,
  isFavorite,
  onToggleFavorite,
  onMoveToTrash,
}: DocumentHeaderProps) {
  const visibleCollaborators = collaborators.slice(0, 3);
  const remainingCount = Math.max(collaborators.length - 3, 0);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center gap-2 px-3 sm:px-5">
        {/* Breadcrumbs */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap gap-1.5 text-xs sm:text-sm">
              <BreadcrumbItem className="hidden sm:flex">
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator className="hidden sm:flex">
                <ChevronRight className="size-3.5" />
              </BreadcrumbSeparator>

              <BreadcrumbItem className="hidden sm:flex">
                <BreadcrumbLink asChild>
                  <Link href={`/workspaces/${workspaceId}`}>
                    {workspaceName}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator className="hidden sm:flex">
                <ChevronRight className="size-3.5" />
              </BreadcrumbSeparator>

              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="flex min-w-0 items-center gap-1.5">
                  <FileText className="size-3.5 shrink-0" />

                  <span className="truncate font-medium">
                    {documentTitle || "Untitled document"}
                  </span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className="flex shrink-0 items-center">
            <div className="flex -space-x-2">
              {visibleCollaborators.map((collaborator) => (
                <Avatar
                  key={collaborator.id}
                  className="size-7 border-2 border-background sm:size-8"
                  title={collaborator.name}
                >
                  <AvatarImage
                    src={collaborator.avatar ?? undefined}
                    alt={collaborator.name}
                  />

                  <AvatarFallback className="text-[10px]">
                    {collaborator.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            {remainingCount > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                +{remainingCount}
              </span>
            )}
          </div>
        )}

        {/* Share */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5"
          onClick={onShare}
        >
          <Share2 className="size-3.5" />
          <span className="hidden sm:inline">Share</span>
        </Button>

        <Button
          type="button"
          variant={isFavorite ? "secondary" : "ghost"}
          size="icon"
          className="size-8 shrink-0"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={onToggleFavorite}
        >
          <Star
            className={`size-4 ${isFavorite ? "fill-yellow-400 text-yellow-500" : ""}`}
          />
        </Button>

        {/* Document actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Document actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onRestore}>Restore</DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={onMoveToTrash}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
