"use client";

import Link from "next/link";
import {
  FilePlus2,
  FolderOpen,
  Users,
  Clock3,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuickActionsProps {
  onCreateDocument?: () => void;
}

const actions = [
  {
    title: "My Documents",
    description: "Manage your documents",
    href: "/documents",
    icon: FolderOpen,
  },
  {
    title: "Shared with Me",
    description: "Access shared documents",
    href: "/shared",
    icon: Users,
  },
  {
    title: "Recent Documents",
    description: "Continue your recent work",
    href: "/recent",
    icon: Clock3,
  },
];

export function QuickActions({
  onCreateDocument,
}: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
        <CardDescription>
          Jump back into your work.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Button
          className="w-full justify-start"
          onClick={onCreateDocument}
        >
          <FilePlus2 className="size-4" />
          Create new document
        </Button>

        <div className="space-y-1">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                key={action.href}
                asChild
                variant="ghost"
                className="h-auto w-full justify-between px-3 py-3"
              >
                <Link href={action.href}>
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />

                    <span className="min-w-0 text-left">
                      <span className="block truncate text-sm font-medium">
                        {action.title}
                      </span>

                      <span className="block truncate text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </span>

                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}