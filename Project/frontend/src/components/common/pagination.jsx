"use client";

import { Button } from "@/components/ui/button";

export function Pagination({ page, setPage, hasNext = true }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="text-sm font-semibold text-muted-foreground">Page {page}</span>
      <Button variant="outline" disabled={!hasNext} onClick={() => setPage(page + 1)}>Next</Button>
    </div>
  );
}
