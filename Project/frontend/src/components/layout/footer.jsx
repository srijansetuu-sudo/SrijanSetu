import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/60 py-10">
      <div className="container-page grid gap-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-primary">SrijanSetu</p>
          <p className="mt-2 text-sm text-muted-foreground">From Thought To Creation</p>
        </div>
        <div className="grid gap-2 text-sm">
          <Link href="/creators">Browse creators</Link>
        </div>
        <p className="text-sm text-muted-foreground">A creator marketplace for custom work, quotations, delivery, payments, and reviews.</p>
      </div>
    </footer>
  );
}
