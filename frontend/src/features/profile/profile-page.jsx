"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, UserCircle } from "lucide-react";
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
  phone_number: z.string().min(7, "Phone number is required"),
  address_line: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postal_code: z.string().min(3, "Postal code is required"),
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

function Field({ label, required = false, children, error }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-primary">
      <span>{label}{required ? <span className="text-red-600"> *</span> : null}</span>
      {children}
      {error ? <span className="text-xs font-semibold text-red-600">{error.message}</span> : null}
    </label>
  );
}

function profilePath(role) {
  if (role === "CREATOR") return "/dashboard/creator";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/customer";
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
      phone_number: user?.phone_number ?? "",
      address_line: user?.address_line ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      postal_code: user?.postal_code ?? "",
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
      phone_number: user?.phone_number ?? "",
      address_line: user?.address_line ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      postal_code: user?.postal_code ?? "",
      brand_name: creator.brand_name ?? "",
      headline: creator.headline ?? "",
      description: creator.description ?? "",
      years_of_experience: creator.years_of_experience ?? 0,
      portfolio_cover_url: creator.portfolio_cover_url ?? "",
      response_time_hours: creator.response_time_hours ?? "",
      instagram_url: creator.instagram_url ?? "",
      website_url: creator.website_url ?? "",
      youtube_url: creator.youtube_url ?? "",
      categories: creator.categories?.map((item) => item.category_name).join(", ") ?? "",
    });
  }, [creatorProfile.data, form, user]);

  const saveProfile = useApiMutation(async (values) => {
    const updatedUser = await userService.updateMe({
      full_name: values.full_name,
      avatar_url: values.avatar_url || null,
      phone_number: values.phone_number,
      address_line: values.address_line,
      city: values.city,
      state: values.state,
      postal_code: values.postal_code,
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
                if (isCreator && !values.headline?.trim()) {
                  form.setError("headline", { message: "Headline is required for creators" });
                  toast.error("Headline is required");
                  return;
                }
                if (isCreator && !values.description?.trim()) {
                  form.setError("description", { message: "Description is required for creators" });
                  toast.error("Description is required");
                  return;
                }
                if (isCreator && !values.categories?.trim()) {
                  form.setError("categories", { message: "At least one category is required for creators" });
                  toast.error("At least one category is required");
                  return;
                }
                saveProfile.mutate(values);
              }, showFormValidationToast)}>
                <Field label="Your name" required error={form.formState.errors.full_name}><Input {...form.register("full_name")} /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Phone number" required error={form.formState.errors.phone_number}><Input {...form.register("phone_number")} /></Field>
                  <Field label="Postal code" required error={form.formState.errors.postal_code}><Input {...form.register("postal_code")} /></Field>
                </div>
                <Field label="Address" required error={form.formState.errors.address_line}><Textarea {...form.register("address_line")} /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="City" required error={form.formState.errors.city}><Input {...form.register("city")} /></Field>
                  <Field label="State" required error={form.formState.errors.state}><Input {...form.register("state")} /></Field>
                </div>
                <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
                  SrijanSetu does not support delivery logistics yet. These details help customers and creators coordinate directly for now; platform delivery support is planned for the future.
                </div>

                {isCreator ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Studio or artist name" required error={form.formState.errors.brand_name}><Input {...form.register("brand_name")} /></Field>
                      <Field label="Headline" required error={form.formState.errors.headline}><Input placeholder="Painter, ceramic artist, decor maker..." {...form.register("headline")} /></Field>
                    </div>
                    <Field label="Description" required error={form.formState.errors.description}><Textarea {...form.register("description")} /></Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Years of experience" error={form.formState.errors.years_of_experience}><Input type="number" {...form.register("years_of_experience")} /></Field>
                      <Field label="Response time hours" error={form.formState.errors.response_time_hours}><Input type="number" {...form.register("response_time_hours")} /></Field>
                      <Field label="Categories" required error={form.formState.errors.categories}><Input placeholder="Paintings, pottery, home decor" {...form.register("categories")} /></Field>
                    </div>
                    <Field label="Portfolio cover URL" error={form.formState.errors.portfolio_cover_url}><Input {...form.register("portfolio_cover_url")} /></Field>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Instagram" error={form.formState.errors.instagram_url}><Input {...form.register("instagram_url")} /></Field>
                      <Field label="Website" error={form.formState.errors.website_url}><Input {...form.register("website_url")} /></Field>
                      <Field label="YouTube" error={form.formState.errors.youtube_url}><Input {...form.register("youtube_url")} /></Field>
                    </div>
                  </>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="submit" disabled={saveProfile.isPending}>Save profile</Button>
                  <p className="text-sm font-semibold text-muted-foreground">Complete the required fields to continue.</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
