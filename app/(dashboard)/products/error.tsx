"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[products] page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong on this page</p>
      <pre className="max-w-xl text-xs text-muted-foreground whitespace-pre-wrap break-all bg-muted rounded p-3">
        {error.message}
        {error.digest ? `\n\nDigest: ${error.digest}` : ""}
      </pre>
      <Button variant="outline" size="sm" onClick={reset}>Try again</Button>
    </div>
  );
}
