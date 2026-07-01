"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { EmptyState, LoadingState } from "@/components/common/states";
import { QuotationCard } from "@/components/common/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { showFormValidationToast, useApiMutation, useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { creatorService, quotationService } from "@/services/api-services";
import { asArray } from "@/lib/utils";

const profileSchema = z.object({
  brand_name: z.string().min(2),
  headline: z.string().min(3),
  description: z.string().min(10),
  years_of_experience: z.coerce.number().min(0),
  portfolio_cover_url: z.string().optional(),
  instagram_url: z.string().optional(),
  website_url: z.string().optional(),
  youtube_url: z.string().optional(),
  categories: z.string().optional(),
});

function Field({ label, children }) {
  return <label className="grid gap-2 text-sm font-semibold text-primary">{label}{children}</label>;
}

export function CreatorProfilePage() {
  const update = useApiMutation((values) => creatorService.updateProfile({ ...values, categories: values.categories?.split(",").map((item) => item.trim()).filter(Boolean) ?? [] }), { successMessage: "Profile updated" });
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { years_of_experience: 0 } });
  return (
    <ProtectedRoute roles={["CREATOR"]}>
      <DashboardShell role="CREATOR">
        <Card><CardContent>
          <h1 className="text-3xl font-bold text-primary">Creator Profile</h1>
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit((values) => update.mutate(values), showFormValidationToast)}>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Brand name" error={errors.brand_name}><Input {...register("brand_name")} /></Field><Field label="Headline" error={errors.headline}><Input {...register("headline")} /></Field></div>
            <Field label="Description" error={errors.description}><Textarea {...register("description")} /></Field>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Years of experience" error={errors.years_of_experience}><Input type="number" {...register("years_of_experience")} /></Field><Field label="Categories" error={errors.categories}><Input placeholder="Illustration, UI Design" {...register("categories")} /></Field></div>
            <Field label="Portfolio cover URL" error={errors.portfolio_cover_url}><Input {...register("portfolio_cover_url")} /></Field>
            <div className="grid gap-4 md:grid-cols-3"><Field label="Instagram" error={errors.instagram_url}><Input {...register("instagram_url")} /></Field><Field label="Website" error={errors.website_url}><Input {...register("website_url")} /></Field><Field label="YouTube" error={errors.youtube_url}><Input {...register("youtube_url")} /></Field></div>
            <Button disabled={update.isPending}>Save profile</Button>
          </form>
        </CardContent></Card>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function CreatorQuotationsPage() {
  const query = useApiQuery(queryKeys.myQuotations, quotationService.my);
  const remove = useApiMutation(quotationService.remove, { successMessage: "Quotation deleted", invalidate: queryKeys.myQuotations });
  const quotations = asArray(query.data);
  return (
    <ProtectedRoute roles={["CREATOR"]}>
      <DashboardShell role="CREATOR">
        <h1 className="text-3xl font-bold text-primary">My Quotations</h1>
        <div className="mt-6 grid gap-4">
          {query.isLoading ? <LoadingState /> : quotations.length ? quotations.map((quotation) => <QuotationCard key={quotation.id} quotation={quotation} onDelete={quotation.status === "ACCEPTED" ? undefined : () => remove.mutate(quotation.id)} />) : <EmptyState title="No quotations sent" />}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
