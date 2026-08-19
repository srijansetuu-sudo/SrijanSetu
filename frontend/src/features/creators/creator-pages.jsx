"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CreatorCard, ReviewCard } from "@/components/common/cards";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProtectedRoute, RoleGuard } from "@/components/common/protected-route";
import { creatorService, reviewService } from "@/services/api-services";
import { queryKeys } from "@/constants/query-keys";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { asArray } from "@/lib/utils";

export function CreatorsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const params = { search: search || undefined, category: category || undefined, limit: 20, offset: (page - 1) * 20 };
  const query = useApiQuery(queryKeys.creators(params), () => creatorService.list(params));
  const creators = asArray(query.data);
  const updateSearch = (value) => {
    setSearch(value);
    setPage(1);
  };
  const updateCategory = (value) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container-page py-10">
        <h1 className="text-4xl font-bold text-primary">Browse Creators</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_260px]">
          <Input placeholder="Search creators" value={search} onChange={(e) => updateSearch(e.target.value)} />
          <Input placeholder="Filter by category" value={category} onChange={(e) => updateCategory(e.target.value)} />
        </div>
        <div className="mt-8">
          {query.isLoading ? <LoadingState /> : creators.length ? <div className="grid gap-5 md:grid-cols-3">{creators.map((creator) => <CreatorCard key={creator.id ?? creator.user_id} creator={creator} />)}</div> : <EmptyState title="No creators found" />}
        </div>
        <Pagination page={page} setPage={setPage} hasNext={creators.length > 0} />
      </main>
      <Footer />
    </ProtectedRoute>
  );
}

export function CreatorDetailsPage() {
  const { id } = useParams();
  const creator = useApiQuery(queryKeys.creator(id), () => creatorService.details(id), { enabled: Boolean(id) });
  const savedCreators = useApiQuery(queryKeys.savedCreators, creatorService.saved);
  const save = useApiMutation(() => creatorService.save(id), {
    successMessage: "Creator saved",
    invalidate: queryKeys.savedCreators,
  });
  const profile = creator.data ?? {};
  const isSaved = asArray(savedCreators.data).some((saved) => saved.creator_id === profile.user_id || saved.creator_user_id === profile.user_id);
  const removeSaved = useApiMutation(() => creatorService.removeSaved(profile.user_id), {
    successMessage: "Saved creator removed",
    invalidate: queryKeys.savedCreators,
  });
  const toggleSaved = () => {
    if (isSaved) {
      removeSaved.mutate();
      return;
    }
    save.mutate();
  };
  const reviews = useApiQuery(queryKeys.reviews(profile.user_id), () => reviewService.byCreator(profile.user_id), { enabled: Boolean(profile.user_id) });
  const categories = profile.categories ?? profile.creator_categories ?? [];
  const isTogglingSaved = save.isPending || removeSaved.isPending || savedCreators.isLoading;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container-page py-10">
        {creator.isLoading ? <LoadingState /> : (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <section>
              <h1 className="text-4xl font-bold text-primary">{profile.brand_name ?? profile.full_name ?? "Creator"}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{profile.headline}</p>
              <div className="mt-5 flex flex-wrap gap-2">{categories.map((cat, i) => <Badge key={cat.id ?? i}>{cat.category_name ?? cat}</Badge>)}</div>
              <Card className="mt-6"><CardContent><h2 className="font-bold text-primary">About</h2><p className="mt-3 text-muted-foreground">{profile.description ?? "This creator has not added a description yet."}</p></CardContent></Card>
              <Card className="mt-6"><CardContent><h2 className="font-bold text-primary">Portfolio</h2>{profile.portfolio_cover_url ? <img src={profile.portfolio_cover_url} alt="Portfolio" className="mt-4 max-h-96 w-full rounded-lg object-cover" /> : <EmptyState title="No portfolio uploaded" />}</CardContent></Card>
            </section>
            <aside className="grid gap-4">
              <Card><CardContent><p className="text-sm text-muted-foreground">Experience</p><p className="text-2xl font-bold text-primary">{profile.years_of_experience ?? 0}+ years</p><RoleGuard roles={["CUSTOMER"]}><Button className="mt-5 w-full" variant={isSaved ? "outline" : "primary"} disabled={isTogglingSaved || !profile.user_id} onClick={toggleSaved}>{isSaved ? "Saved Creator - click to remove" : "Save Creator"}</Button></RoleGuard></CardContent></Card>
              <Card><CardContent><h2 className="font-bold text-primary">Reviews</h2><div className="mt-4 grid gap-3">{asArray(reviews.data).length ? asArray(reviews.data).map((review) => <ReviewCard key={review.id} review={review} />) : <EmptyState title="No reviews yet" />}</div></CardContent></Card>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </ProtectedRoute>
  );
}
