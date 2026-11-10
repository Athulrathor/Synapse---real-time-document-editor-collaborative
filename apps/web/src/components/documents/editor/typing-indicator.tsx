"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PencilLine } from "lucide-react";
import type { CollaboratorPresence } from "@/types/presence.type";

interface TypingIndicatorProps {
  users: CollaboratorPresence[];
  currentUserId: string;
}

export function TypingIndicator({
  users,
  currentUserId,
}: TypingIndicatorProps) {
  const typingUsers = users.filter(
    (user) => user.isTyping && user.userId !== currentUserId,
  );

  const count = typingUsers.length;

  const message =
    count === 0
      ? ""
      : count === 1
        ? `${typingUsers[0].name ?? "Someone"} is typing`
        : count === 2
          ? `${typingUsers[0].name ?? "Someone"} and ${
              typingUsers[1].name ?? "someone"
            } are typing`
          : `${typingUsers[0].name ?? "Someone"} and ${
              count - 1
            } others are typing`;

  return (
    <AnimatePresence mode="wait">
      {count > 0 && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-2 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <PencilLine className="size-3.5 shrink-0" />

          <span>{message}…</span>

          <span className="flex items-center gap-0.5" aria-hidden="true">
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="size-1 animate-bounce rounded-full bg-current" />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}