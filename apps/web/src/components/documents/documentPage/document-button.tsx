"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateDocument } from "@/hooks/use-document";

interface NewDocumentButtonProps {
  workspaceId: string;
}

export function NewDocumentButton({
  workspaceId,
}: NewDocumentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titles, setTitles] = useState("");

  const createDocument = useCreateDocument(workspaceId);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = titles.trim();
    console.log(titles,trimmedTitle)
    if (!trimmedTitle) return;

    try {
      const document = await createDocument.mutateAsync({
        title: trimmedTitle,
        content: undefined
      });

      setOpen(false);
      setTitles("");

      router.push(
        `/workspaces/${workspaceId}/documents/${document.id}`,
      );
    } catch {
      // Keep the dialog open so the user can retry.
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          New document
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create document</DialogTitle>
            <DialogDescription>
              Enter a title for your new workspace document.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              placeholder="Untitled document"
              value={titles}
              onChange={(event) => setTitles(event.target.value)}
              maxLength={200}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createDocument.isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={!titles.trim() || createDocument.isPending}
            >
              {createDocument.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}