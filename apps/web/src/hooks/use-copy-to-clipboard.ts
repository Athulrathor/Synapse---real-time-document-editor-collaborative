"use client";

import { useState } from "react";

type CopyStatus = "idle" | "success" | "error";

interface CopyResult {
  status: CopyStatus;
  copiedText: string | null;
}

export function useCopyToClipboard() {
  const [result, setResult] = useState<CopyResult>({
    status: "idle",
    copiedText: null,
  });

  async function copyText(text: string): Promise<boolean> {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable.");
      }

      await navigator.clipboard.writeText(text);

      setResult({
        status: "success",
        copiedText: text,
      });

      return true;
    } catch {
      setResult({
        status: "error",
        copiedText: null,
      });

      return false;
    }
  }

  function resetStatus() {
    setResult({
      status: "idle",
      copiedText: null,
    });
  }

  return {
    ...result,
    copyText,
    resetStatus,
    isCopied: result.status === "success",
    hasError: result.status === "error",
  };
}
