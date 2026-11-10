"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ConnectionNoticeProps {
  message: string;
  isRetrying?: boolean;
  onRetry?: () => void;
}

export function ConnectionNotice({
  message,
  isRetrying = false,
  onRetry,
}: ConnectionNoticeProps) {
  return (
    <Alert
      variant="destructive"
      className="flex flex-col gap-3 rounded-none border-x-0 border-t-0 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />

        <div className="min-w-0">
          <AlertTitle className="text-sm">
            Document connection issue
          </AlertTitle>

          <AlertDescription className="wrap-break-words text-xs">
            {message}
          </AlertDescription>
        </div>
      </div>

      {onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isRetrying}
          onClick={onRetry}
          className="w-full shrink-0 sm:w-auto"
        >
          {isRetrying ? (
            <Loader2 className="mr-2 size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-3.5" />
          )}

          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
      )}
    </Alert>
  );
}