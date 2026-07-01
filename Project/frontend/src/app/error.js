"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted px-6">
      <div className="surface max-w-md rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-primary">Something went wrong</h1>
        <p className="mt-3 text-muted-foreground">{error?.message ?? "Please try again."}</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
