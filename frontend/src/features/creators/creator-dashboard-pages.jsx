"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ImagePlus, Trash2 } from "lucide-react";
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
import { creatorService, quotationService, uploadService } from "@/services/api-services";
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
  portfolio_photos: z.array(z.string()).max(4).optional(),
});

function Field({ label, children, description, as: Component = "label" }) {
  return <Component className="grid gap-2 text-sm font-semibold text-primary"><span>{label}</span>{children}{description ? <span className="text-xs font-normal text-muted-foreground">{description}</span> : null}</Component>;
}

export function CreatorProfilePage() {
  const profile = useApiQuery(queryKeys.creatorProfileMe, creatorService.myProfile);
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const update = useApiMutation(
    (values) => creatorService.updateProfile({
      ...values,
      categories: values.categories?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
      portfolio_photos: portfolioPhotos,
      portfolio_cover_url: portfolioPhotos[0] || values.portfolio_cover_url || undefined,
    }),
    { successMessage: "Profile updated", invalidate: queryKeys.creatorProfileMe }
  );
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(profileSchema), defaultValues: { years_of_experience: 0, categories: "" } });

  useEffect(() => {
    if (!profile.data) return;
    const photos = asArray(profile.data.portfolio_photos).map((photo) => photo.image_url).filter(Boolean);
    const fallbackPhotos = photos.length ? photos : [profile.data.portfolio_cover_url].filter(Boolean);
    setPortfolioPhotos(fallbackPhotos.slice(0, 4));
    reset({
      brand_name: profile.data.brand_name ?? "",
      headline: profile.data.headline ?? "",
      description: profile.data.description ?? "",
      years_of_experience: profile.data.years_of_experience ?? 0,
      portfolio_cover_url: profile.data.portfolio_cover_url ?? "",
      instagram_url: profile.data.instagram_url ?? "",
      website_url: profile.data.website_url ?? "",
      youtube_url: profile.data.youtube_url ?? "",
      categories: asArray(profile.data.categories).map((category) => category.category_name ?? category).join(", "),
    });
  }, [profile.data, reset]);

  const handlePortfolioUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    const availableSlots = 4 - portfolioPhotos.length;
    const selectedFiles = files.slice(0, availableSlots);
    if (!selectedFiles.length) {
      event.target.value = "";
      return;
    }
    const invalidFile = selectedFiles.find((file) => !file.type.startsWith("image/") || file.size > 5_000_000);
    if (invalidFile) {
      showFormValidationToast({ portfolio_photos: { message: "Artwork photos must be images under 5 MB" } });
      event.target.value = "";
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const uploadedUrls = [];
      for (const file of selectedFiles) {
        uploadedUrls.push(await uploadService.uploadFile(file, "creator-artwork"));
      }
      setPortfolioPhotos((current) => [...current, ...uploadedUrls.filter(Boolean)].slice(0, 4));
    } catch {
      showFormValidationToast({ portfolio_photos: { message: "Artwork photo upload failed" } });
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  return (
    <ProtectedRoute roles={["CREATOR"]}>
      <DashboardShell role="CREATOR">
        <Card><CardContent>
          <h1 className="text-3xl font-bold text-primary">Creator Profile</h1>
          {profile.isLoading ? <LoadingState /> : null}
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit((values) => update.mutate(values), showFormValidationToast)}>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Brand name" error={errors.brand_name}><Input {...register("brand_name")} /></Field><Field label="Headline" error={errors.headline}><Input {...register("headline")} /></Field></div>
            <Field label="Description" error={errors.description}><Textarea {...register("description")} /></Field>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Years of experience" error={errors.years_of_experience}><Input type="number" {...register("years_of_experience")} /></Field><Field label="Categories" error={errors.categories}><Input placeholder="Illustration, UI Design" {...register("categories")} /></Field></div>
            <Field label="Portfolio cover URL" error={errors.portfolio_cover_url}><Input {...register("portfolio_cover_url")} /></Field>
            <Field as="div" label="Artwork photos" description={`${portfolioPhotos.length}/4 photos added. Customers can view these before accepting a quotation.`}>
              <div className="grid gap-3">
                {portfolioPhotos.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {portfolioPhotos.map((photoUrl, index) => (
                      <div key={`${photoUrl}-${index}`} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                        <img src={photoUrl} alt={`Artwork ${index + 1}`} className="h-36 w-full object-cover" />
                        <Button type="button" size="icon" variant="outline" className="absolute right-2 top-2 h-8 w-8 bg-white/90" onClick={() => setPortfolioPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove artwork photo">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <input type="file" accept="image/*" multiple onChange={handlePortfolioUpload} disabled={isUploadingPhoto || portfolioPhotos.length >= 4} className="rounded-lg border border-border bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" />
                  <span className="inline-flex items-center gap-2 text-xs font-normal text-muted-foreground"><ImagePlus className="h-4 w-4" />{isUploadingPhoto ? "Uploading artwork..." : "Upload up to 4 artwork photos"}</span>
                </div>
              </div>
            </Field>
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
