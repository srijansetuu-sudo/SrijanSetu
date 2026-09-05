"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ImagePlus, Trash2, UserCircle } from "lucide-react";
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
import { creatorService, uploadService, userService } from "@/services/api-services";
import { useAuthStore } from "@/store/auth-store";
import { asArray } from "@/lib/utils";

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
  portfolio_photos: z.array(z.string()).max(4).optional(),
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

function hasRequiredUserFields(values) {
  return Boolean(
    values.full_name?.trim().length >= 2 &&
    values.phone_number?.trim().length >= 7 &&
    values.address_line?.trim().length >= 5 &&
    values.city?.trim().length >= 2 &&
    values.state?.trim().length >= 2 &&
    values.postal_code?.trim().length >= 3
  );
}

export function ProfilePage() {
  const router = useRouter();
  const { user, role, setSession } = useAuthStore();
  const isCreator = role === "CREATOR";
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [artworkQueue, setArtworkQueue] = useState([]);
  const [cropDraft, setCropDraft] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
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
  const watchedValues = form.watch();
  const readinessItems = [
    { label: "Contact", done: hasRequiredUserFields(watchedValues) },
    { label: "Studio", done: Boolean(watchedValues.brand_name?.trim() && watchedValues.headline?.trim() && watchedValues.description?.trim() && watchedValues.categories?.trim()) },
    { label: "Artwork", done: portfolioPhotos.length > 0 },
  ];
  const completedReadinessItems = readinessItems.filter((item) => item.done).length;

  useEffect(() => {
    const creator = creatorProfile.data ?? {};
    const photos = asArray(creator.portfolio_photos).map((photo) => photo.image_url).filter(Boolean);
    const fallbackPhotos = photos.length ? photos : [creator.portfolio_cover_url].filter(Boolean);
    setPortfolioPhotos(fallbackPhotos.slice(0, 4));
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
      await creatorService.updateProfile(creatorProfilePayload(values, portfolioPhotos));
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

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await uploadService.uploadFile(file, "profile-photos");
      form.setValue("avatar_url", uploadedUrl || "", { shouldDirty: true, shouldValidate: true });

      const values = { ...form.getValues(), avatar_url: uploadedUrl };
      if (hasRequiredUserFields(values)) {
        const updatedUser = await userService.updateMe({
          full_name: values.full_name,
          avatar_url: values.avatar_url || null,
          phone_number: values.phone_number,
          address_line: values.address_line,
          city: values.city,
          state: values.state,
          postal_code: values.postal_code,
        });
        setSession({ user: updatedUser });
        toast.success("Profile photo saved");
      } else {
        toast.success("Photo uploaded. Save your profile to keep it.");
      }
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const creatorProfilePayload = (values, nextPortfolioPhotos) => ({
    brand_name: values.brand_name,
    headline: values.headline,
    description: values.description,
    years_of_experience: values.years_of_experience ?? 0,
    response_time_hours: values.response_time_hours || null,
    instagram_url: values.instagram_url,
    website_url: values.website_url,
    youtube_url: values.youtube_url,
    categories: values.categories?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
    portfolio_photos: nextPortfolioPhotos,
    portfolio_cover_url: nextPortfolioPhotos[0] || values.portfolio_cover_url || undefined,
  });

  const canSaveCreatorArtwork = (values) => Boolean(
    values.brand_name?.trim() &&
    values.headline?.trim() &&
    values.description?.trim() &&
    values.categories?.trim()
  );

  const persistArtworkPhotos = async (nextPortfolioPhotos) => {
    if (!isCreator) return;
    const values = form.getValues();
    if (!canSaveCreatorArtwork(values)) {
      toast.success("Artwork ready. Complete creator details and save profile.");
      return;
    }
    await creatorService.updateProfile(creatorProfilePayload(values, nextPortfolioPhotos));
    toast.success("Artwork saved");
  };

  const openNextArtworkCrop = (queue) => {
    const [nextFile, ...remainingFiles] = queue;
    if (!nextFile) {
      setArtworkQueue([]);
      return;
    }
    setArtworkQueue(remainingFiles);
    setCropDraft({ file: nextFile, url: URL.createObjectURL(nextFile) });
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
  };

  const closeArtworkCrop = () => {
    if (cropDraft?.url) URL.revokeObjectURL(cropDraft.url);
    setCropDraft(null);
  };

  const makeCroppedArtworkFile = async () => {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = cropDraft.url;
    });

    const width = 1200;
    const height = 900;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const scale = Math.max(width / image.width, height / image.height) * cropZoom;
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    const maxOffsetX = Math.max(0, (drawnWidth - width) / 2);
    const maxOffsetY = Math.max(0, (drawnHeight - height) / 2);
    const x = (width - drawnWidth) / 2 + (cropOffsetX / 100) * maxOffsetX;
    const y = (height - drawnHeight) / 2 + (cropOffsetY / 100) * maxOffsetY;

    context.drawImage(image, x, y, drawnWidth, drawnHeight);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("Crop failed");
    return new File([blob], cropDraft.file.name.replace(/\.[^.]+$/, "-cropped.jpg"), { type: "image/jpeg" });
  };

  const confirmArtworkCrop = async () => {
    if (!cropDraft) return;
    setIsUploadingArtwork(true);
    try {
      const croppedFile = await makeCroppedArtworkFile();
      const uploadedUrl = await uploadService.uploadFile(croppedFile, "creator-artwork");
      const nextPhotos = [...portfolioPhotos, uploadedUrl].filter(Boolean).slice(0, 4);
      setPortfolioPhotos(nextPhotos);
      await persistArtworkPhotos(nextPhotos);
      closeArtworkCrop();
      openNextArtworkCrop(artworkQueue);
    } catch {
      showFormValidationToast({ portfolio_photos: { message: "Artwork crop or upload failed" } });
    } finally {
      setIsUploadingArtwork(false);
    }
  };

  const handleArtworkPhotos = async (event) => {
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
    openNextArtworkCrop(selectedFiles);
    event.target.value = "";
  };

  const removeArtworkPhoto = async (index) => {
    const nextPhotos = portfolioPhotos.filter((_, itemIndex) => itemIndex !== index);
    setPortfolioPhotos(nextPhotos);
    try {
      await persistArtworkPhotos(nextPhotos);
    } catch {
      showFormValidationToast({ portfolio_photos: { message: "Artwork update failed" } });
    }
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

        <div className="grid gap-6">
          <Card>
            <CardContent>
              <div className={`grid gap-5 ${isCreator ? "lg:grid-cols-[minmax(260px,0.85fr)_minmax(260px,1fr)_minmax(320px,1.25fr)]" : "lg:grid-cols-[minmax(260px,420px)_1fr]"} lg:items-stretch`}>
                <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserCircle className="h-12 w-12 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-primary">{user?.full_name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-primary">{role}</p>
                    <label className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm ${isUploadingPhoto ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                      <Camera className="h-4 w-4" />
                      {isUploadingPhoto ? "Uploading..." : "Upload photo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={isUploadingPhoto} />
                    </label>
                  </div>
                </div>

                {isCreator ? (
                  <>
                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-primary">Profile readiness</p>
                        <p className="text-sm font-bold text-primary">{completedReadinessItems}/{readinessItems.length}</p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${(completedReadinessItems / readinessItems.length) * 100}%` }} />
                      </div>
                      <div className="mt-4 grid gap-2">
                        {readinessItems.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3 text-xs font-semibold">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className={item.done ? "text-primary" : "text-muted-foreground"}>{item.done ? "Done" : "Pending"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-primary">Artwork</p>
                        <p className="text-xs font-semibold text-muted-foreground">{portfolioPhotos.length}/4</p>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {portfolioPhotos.map((photoUrl, index) => (
                          <img key={`${photoUrl}-preview-${index}`} src={photoUrl} alt={`Artwork preview ${index + 1}`} className="h-24 w-full rounded-lg object-cover" />
                        ))}
                        {Array.from({ length: Math.max(0, 4 - portfolioPhotos.length) }).map((_, index) => (
                          <div key={`empty-artwork-${index}`} className="grid h-24 place-items-center rounded-lg border border-dashed border-border bg-white text-muted-foreground">
                            <ImagePlus className="h-5 w-5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
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
                    <div className="grid gap-2 text-sm font-semibold text-primary">
                      <span>Artwork photos</span>
                      {portfolioPhotos.length ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {portfolioPhotos.map((photoUrl, index) => (
                            <div key={`${photoUrl}-${index}`} className="relative overflow-hidden rounded-lg border border-border bg-muted">
                              <img src={photoUrl} alt={`Artwork ${index + 1}`} className="h-36 w-full object-cover" />
                              <Button type="button" size="icon" variant="outline" className="absolute right-2 top-2 h-8 w-8 bg-white/90" onClick={() => removeArtworkPhoto(index)} aria-label="Remove artwork photo">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        <input type="file" accept="image/*" multiple onChange={handleArtworkPhotos} disabled={isUploadingArtwork || portfolioPhotos.length >= 4} className="rounded-lg border border-border bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" />
                        <span className="inline-flex items-center gap-2 text-xs font-normal text-muted-foreground"><ImagePlus className="h-4 w-4" />{isUploadingArtwork ? "Uploading artwork..." : `${portfolioPhotos.length}/4 artwork photos added`}</span>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Instagram" error={form.formState.errors.instagram_url}><Input {...form.register("instagram_url")} /></Field>
                      <Field label="Website" error={form.formState.errors.website_url}><Input {...form.register("website_url")} /></Field>
                      <Field label="YouTube" error={form.formState.errors.youtube_url}><Input {...form.register("youtube_url")} /></Field>
                    </div>
                  </>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="submit" disabled={saveProfile.isPending || isUploadingPhoto}>Save profile</Button>
                  <p className="text-sm font-semibold text-muted-foreground">Complete the required fields to continue.</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {cropDraft ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-primary/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-[0_24px_80px_rgba(31,44,119,0.24)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-primary">Crop artwork photo</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Frame the artwork before it is uploaded.</p>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{portfolioPhotos.length + 1}/4</p>
              </div>

              <div className="mt-5 overflow-hidden rounded-lg border border-border bg-muted">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={cropDraft.url}
                    alt="Artwork crop preview"
                    className="h-full w-full object-cover"
                    style={{
                      transform: `translate(${cropOffsetX * 0.35}%, ${cropOffsetY * 0.35}%) scale(${cropZoom})`,
                      transformOrigin: "center",
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold text-primary">
                  Zoom
                  <input type="range" min="1" max="2.5" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-primary">
                  Move left/right
                  <input type="range" min="-100" max="100" step="1" value={cropOffsetX} onChange={(event) => setCropOffsetX(Number(event.target.value))} />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-primary">
                  Move up/down
                  <input type="range" min="-100" max="100" step="1" value={cropOffsetY} onChange={(event) => setCropOffsetY(Number(event.target.value))} />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" disabled={isUploadingArtwork} onClick={() => { closeArtworkCrop(); openNextArtworkCrop(artworkQueue); }}>Skip</Button>
                <Button type="button" variant="outline" disabled={isUploadingArtwork} onClick={closeArtworkCrop}>Cancel</Button>
                <Button type="button" disabled={isUploadingArtwork} onClick={confirmArtworkCrop}>{isUploadingArtwork ? "Uploading..." : "Crop and upload"}</Button>
              </div>
            </div>
          </div>
        ) : null}
      </DashboardShell>
    </ProtectedRoute>
  );
}
