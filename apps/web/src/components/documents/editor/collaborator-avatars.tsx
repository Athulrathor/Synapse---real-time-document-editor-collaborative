"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { env } from "@/libs/env";
import type { CollaboratorPresence } from "@/types/presence.type";
import { Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const avatarVariants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: 4,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    y: -4,
  },
};

interface CollaboratorAvatarsProps {
  users: CollaboratorPresence[];
  maxVisible?: number;
}

function getInitials(name?: string, userId?: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  return userId?.slice(0, 2).toUpperCase() ?? "?";
}

function getUserStatus(user: CollaboratorPresence) {
  if (user.isOnline === false) {
    return {
      label: "Offline",
      indicator: "bg-muted-foreground/75",
      animation: "",
      opacity: "opacity-75",
    };
  }

  if (user.isTyping) {
    return {
      label: "Typing",
      indicator: "bg-indigo-500",
      animation: "animate-collaborator-pulse",
      opacity: "",
    };
  }

  if (user.status === "EDITING") {
    return {
      label: "Editing",
      indicator: "bg-emerald-500",
      animation: "",
      opacity: "",
    };
  }

  return {
    label: "Viewing",
    indicator: "bg-emerald-500",
    animation: "",
    opacity: "",
  };
}

export function CollaboratorAvatars({
  users,
  maxVisible = 4,
}: CollaboratorAvatarsProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = Math.max(0, users.length - visibleUsers.length);
  const shouldReduceMotion = useReducedMotion();

  if (users.length === 0) return null;

  const popoverMotion = shouldReduceMotion
  ? {}
  : {
      initial: { opacity: 0, y: 6, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 6, scale: 0.97 },
      transition: { duration: 0.18, ease: "easeOut" as const },
    };

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleUsers.map((user) => {
              const isTyping = user.isTyping;
              const isEditing = user.status === "EDITING";

              const indicatorColor = isTyping
                ? "bg-indigo-500"
                : "bg-emerald-500";

              return (
                <Tooltip key={user.userId}>
                  <TooltipTrigger asChild>
                    <motion.div
                      layout
                      {...popoverMotion}
                      className="relative"
                    >
                      <Avatar className="size-8 cursor-default border-2 border-background">
                        {user.avatarPath && (
                          <AvatarImage
                            src={`${env.urls.ImagekitUrl}/${user.avatarPath}`}
                            alt={user.name ?? "Collaborator"}
                          />
                        )}

                        <AvatarFallback className="text-[10px] font-medium">
                          {getInitials(user.name, user.userId)}
                        </AvatarFallback>
                      </Avatar>

                      <motion.span
                        animate={
                          isTyping && !shouldReduceMotion
                            ? { scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }
                            : { scale: 1, opacity: 1 }
                        }
                        transition={
                          isTyping && !shouldReduceMotion
                            ? {
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }
                            : { duration: 0.2 }
                        }
                        className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background ${indicatorColor}`}
                        aria-label={
                          isTyping 
                            ? "Typing"
                            : isEditing
                              ? "Editing"
                              : "Viewing"
                        }
                      />
                    </motion.div>
                  </TooltipTrigger>

                  <TooltipContent side="bottom">
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {user.name ?? `User ${user.userId.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isTyping
                          ? "Typing..."
                          : isEditing
                            ? "Editing"
                            : "Viewing"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </AnimatePresence>
        </div>

        {remainingCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="ml-2 flex size-8 items-center justify-center rounded-full border bg-muted text-xs font-medium transition-colors hover:bg-accent"
                aria-label={`View ${remainingCount} additional collaborators`}
              >
                +{remainingCount}
              </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-72 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Collaborators ({users.length})
                </h3>
              </div>

              <div className="max-h-64 space-y-3 overflow-y-auto">
                {users.map((user) => {
                  const status = getUserStatus(user);

                  return (
                    <div key={user.userId} className="flex items-center gap-3">
                      <Avatar className="size-9">
                        {user.avatarPath && (
                          <AvatarImage
                            src={`${env.urls.ImagekitUrl}/${user.avatarPath}`}
                            alt={user.name ?? "Collaborator"}
                          />
                        )}

                        <AvatarFallback className="text-xs">
                          {getInitials(user.name, user.userId)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.name ?? `User ${user.userId.slice(0, 8)}`}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {status.label}
                        </p>
                      </div>

                      <span
                        className={`size-2.5 shrink-0 rounded-full transition-colors duration-200 ${status.indicator} ${status.animation} ${status.opacity}`}
                        aria-label={status.label}
                      />
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
}
