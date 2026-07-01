"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ExternalLink, UserCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showFormValidationToast, useApiMutation, useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { creatorService, userService } from "@/services/api-services";
import { useAuthStore } from "@/store/auth-store";

const profileSchema = z.object({
  full_name: z.string().min(2, "Your name is required"),
  avatar_url: z.string().optional(),
  brand_name: z.string().optional(),
  headline: z.string().optional(),
  description: z.string().optional(),
  years_of_experience: z.coerce.number().min(0).optional(),
  portfolio_cover_url: z.string().optional(),
  response_time_hours: z.coerce.number().min(0).optional(),
  instagram_url: z.string().optional(),
  website_url: z.string().optional(),
  youtube_url: z.string().optional(),
  categories: z.string().optional(),
});

function Field({ label, required = false, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-primary">
      <span>{label}{required ? <span className="text-red-600"> *</span> : null}</span>
      {children}
    </label>
  );
}

function profilePath(role) {
  return role === "CREATOR" ? "/dashboard/creator" : "/dashboard/customer";
}

export function ProfilePage() {
  const router = useRouter();
  const { user, role, setSession } = useAuthStore();
  const isCreator = role === "CREATOR";
  const creatorProfile = useApiQuery(queryKeys.creatorProfileMe, creatorService.myProfile, { enabled: isCreator, retry: false });
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      avatar_url: user?.avatar_url ?? "",
      years_of_experience: 0,
      response_time_hours: "",
    },
  });
  const avatarUrl = form.watch("avatar_url");

  useEffect(() => {
    const creator = creatorProfile.data ?? {};
    form.reset({
      full_name: user?.full_name ?? "",
      avatar_url: user?.avatar_url ?? "",
      brand_name: creator.brand_name ?? "",
      headline: creator.headline ?? "",
      description: creator.description ?? "",
      years_of_experience: creator.years_of_experience ?? 0,
      portfolio_cover_url: creator.portfolio_cover_url ?? "",
      response_time_hours: creator.response_time_hours ?? "",
      instagram_url: creator.instagram_url ?? "",
      website_url: creator.website_url ?? "",
      youtube_url: creator.youtube_url ?? "",
      categories: "",
    });
  }, [creatorProfile.data, form, user]);

  const saveProfile = useApiMutation(async (values) => {
    const updatedUser = await userService.updateMe({
      full_name: values.full_name,
      avatar_url: values.avatar_url || null,
    });

    if (isCreator) {
      await creatorService.updateProfile({
        brand_name: values.brand_name,
        headline: values.headline,
        description: values.description,
        years_of_experience: values.years_of_experience ?? 0,
        portfolio_cover_url: values.portfolio_cover_url,
        response_time_hours: values.response_time_hours || null,
        instagram_url: values.instagram_url,
        website_url: values.website_url,
        youtube_url: values.youtube_url,
        categories: values.categories?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
      });
    }

    return updatedUser;
  }, {
    successMessage: "Profile saved",
    invalidate: queryKeys.me,
    onSuccess: (updatedUser) => {
      setSession({ user: updatedUser });
      router.push(profilePath(role));
    },
  });

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => form.setValue("avatar_url", reader.result, { shouldDirty: true });
    reader.readAsDataURL(file);
  };

  return (
    <ProtectedRoute>
      <DashboardShell role={role}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Profile overview</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">{isCreator ? "Creator Profile" : "Customer Profile"}</h1>
          </div>
          <Button asChild variant="outline"><Link href={profilePath(role)}>Skip for now</Link></Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardContent>
              <div className="grid place-items-center text-center">
                <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-border bg-muted">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserCircle className="h-14 w-14 text-muted-foreground" />}
                </div>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm">
                  <Camera className="h-4 w-4" />
                  Upload photo
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                </label>
                <p className="mt-4 text-sm text-muted-foreground">{user?.email}</p>
                <p className="mt-1 text-xs font-bold uppercase text-primary">{role}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <form className="grid gap-4" onSubmit={form.handleSubmit((values) => {
                if (isCreator && !values.brand_name?.trim()) {
                  form.setError("brand_name", { message: "Brand name is required for creators" });
                  toast.error("Brand name is required");
                  return;
                }
                saveProfile.mutate(values);
              }, showFormValidationToast)}>
                <Field label="Your name" required error={form.formState.errors.full_name}><Input {...form.register("full_name")} /></Field>
                <Field label="Profile photo URL" error={form.formState.errors.avatar_url}><Input {...form.register("avatar_url")} /></Field>

                {isCreator ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Brand name" required error={form.formState.errors.brand_name}><Input {...form.register("brand_name")} /></Field>
                      <Field label="Headline" error={form.formState.errors.headline}><Input placeholder="Wedding filmmaker, logo designer..." {...form.register("headline")} /></Field>
                    </div>
                    <Field label="Description" error={form.formState.errors.description}><Textarea {...form.register("description")} /></Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Years of experience" error={form.formState.errors.years_of_experience}><Input type="number" {...form.register("years_of_experience")} /></Field>
                      <Field label="Response time hours" error={form.formState.errors.response_time_hours}><Input type="number" {...form.register("response_time_hours")} /></Field>
                      <Field label="Categories" error={form.formState.errors.categories}><Input placeholder="Logo, Video, UI" {...form.register("categories")} /></Field>
                    </div>
                    <Field label="Portfolio cover URL" error={form.formState.errors.portfolio_cover_url}><Input {...form.register("portfolio_cover_url")} /></Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Instagram" error={form.formState.errors.instagram_url}><Input {...form.register("instagram_url")} /></Field>
                      <Field label="Website" error={form.formState.errors.website_url}><Input {...form.register("website_url")} /></Field>
                      <Field label="YouTube" error={form.formState.errors.youtube_url}><Input {...form.register("youtube_url")} /></Field>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
                    Customer profile details can stay simple for now. Your name and photo help creators recognize who posted a requirement.
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="submit" disabled={saveProfile.isPending}>Save profile</Button>
                  <Link href={profilePath(role)} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Go to dashboard <ExternalLink className="h-4 w-4" /></Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
