import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/60 py-10">
      <div className="container-page grid gap-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-primary">SrijanSetu</p>
          <p className="mt-2 text-sm text-muted-foreground">Discover handmade art and artisan-made decor</p>
        </div>
        <div className="grid gap-2 text-sm">
          <Link href="/creators">Explore creators</Link>
        </div>
        <p className="text-sm text-muted-foreground">A place to discover original art, handcrafted decor, and meaningful commissions from artists and makers.</p>
      </div>
    </footer>
  );
}
