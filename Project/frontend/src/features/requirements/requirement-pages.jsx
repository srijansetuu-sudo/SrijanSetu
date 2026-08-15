"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarDays, Clock, IndianRupee, Send, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute, RoleGuard } from "@/components/common/protected-route";
import { RequirementCard, QuotationCard } from "@/components/common/cards";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { showFormValidationToast, useApiMutation, useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { paymentService, quotationService, requirementService, uploadService } from "@/services/api-services";
import { asArray, dateLabel, money } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const RAZORPAY_UPI_DISPLAY_CONFIG = {
  display: {
    blocks: {
      upi: {
        name: "Pay using UPI",
        instruments: [{ method: "upi" }],
      },
    },
    sequence: ["block.upi"],
    preferences: {
      show_default_blocks: true,
    },
  },
};

function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function todayDateInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

const requirementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget_min: z.coerce.number().positive("Minimum budget must be greater than 0"),
  budget_max: z.coerce.number().positive("Maximum budget must be greater than 0"),
  deadline: z.string().optional(),
  ai_generated_reference: z.string().optional(),
}).refine((values) => values.budget_max >= values.budget_min, {
  message: "Maximum budget cannot be less than minimum budget",
  path: ["budget_max"],
}).refine((values) => !values.deadline || values.deadline >= todayDateInputValue(), {
  message: "Deadline cannot be in the past",
  path: ["deadline"],
});

const quotationSchema = z.object({
  proposed_price: z.coerce.number().positive("Proposed price must be greater than 0"),
  estimated_days: z.coerce.number().int("Estimated days must be a whole number").positive("Estimated days must be greater than 0"),
  revisions_allowed: z.coerce.number().int("Revisions must be a whole number").min(0, "Revisions cannot be negative").max(20, "Revisions cannot exceed 20"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

function FormField({ label, children, required = false, description, error }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-primary">
      <span>
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </span>
      {description ? <span className="text-xs font-normal text-muted-foreground">{description}</span> : null}
      {children}
      {error ? <span className="text-xs font-semibold text-red-600">{error.message}</span> : null}
    </label>
  );
}

function RequirementStat({ icon: Icon, label, value }) {
  return (
    <Card className="border-white/80 bg-white/85 shadow-[0_18px_44px_rgba(31,44,119,0.08)] hover:-translate-y-0">
      <CardContent className="flex items-center gap-4 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-muted-foreground">{label}</span>
          <span className="mt-1 block truncate text-lg font-bold text-primary">{value}</span>
        </span>
      </CardContent>
    </Card>
  );
}

export function RequirementsPage({ dashboard = false }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = { search: search || undefined, limit: 20, offset: (page - 1) * 20 };
  const query = useApiQuery(queryKeys.requirements(params), () => requirementService.list(params));
  const requirements = asArray(query.data);
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-primary">Requirements</h1>
      </div>
      <Input className="mt-6" placeholder="Search requirements" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-8">{query.isLoading ? <LoadingState /> : requirements.length ? <div className="grid gap-5 md:grid-cols-2">{requirements.map((item) => <RequirementCard key={item.id} requirement={item} />)}</div> : <EmptyState title="No requirements found" />}</div>
      <Pagination page={page} setPage={setPage} hasNext={requirements.length > 0} />
    </>
  );
  if (dashboard) return <ProtectedRoute roles={["CREATOR"]}><DashboardShell role="CREATOR">{content}</DashboardShell></ProtectedRoute>;
  return <ProtectedRoute roles={["CREATOR"]}><DashboardShell role="CREATOR">{content}</DashboardShell></ProtectedRoute>;
}

export function RequirementDetailsPage() {
  const { id } = useParams();
  const query = useApiQuery(queryKeys.requirement(id), () => requirementService.details(id), { enabled: Boolean(id) });
  const myQuotations = useApiQuery(queryKeys.myQuotations, quotationService.my, { enabled: Boolean(id) });
  const quote = useApiMutation((payload) => quotationService.create({ ...payload, requirement_id: id }), { successMessage: "Quotation sent", invalidate: queryKeys.myQuotations });
  const deleteQuote = useApiMutation(quotationService.remove, { successMessage: "Quotation deleted", invalidate: queryKeys.myQuotations });
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({ resolver: zodResolver(quotationSchema) });
  const item = query.data ?? {};
  const existingQuotation = asArray(myQuotations.data).find((quotation) => quotation.requirement_id === id);
  const budgetMin = Number(item.budget_min ?? 0);
  const budgetMax = Number(item.budget_max ?? 0);
  const budgetMid = budgetMin && budgetMax ? Math.round((budgetMin + budgetMax) / 2) : "";
  const pricePresets = Array.from(new Set([budgetMin, budgetMid, budgetMax].filter(Boolean)));
  const selectedPrice = watch("proposed_price");
  const selectedDays = watch("estimated_days");
  const selectedRevisions = watch("revisions_allowed");
  const message = watch("message") ?? "";
  const setQuoteValue = (name, value) => setValue(name, value, { shouldDirty: true, shouldValidate: true });
  const canQuote = item.status === "OPEN";

  return (
    <ProtectedRoute roles={["CREATOR"]}>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(135deg,#fff7b8_0%,#f8fbff_34%,#eaf1ff_70%,#fffdf1_100%)]">
        {query.isLoading ? <LoadingState /> : (
          <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_440px]">
            <section className="min-w-0 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="primary" className="rounded-lg px-3 py-1.5">{item.status}</Badge>
                <span className="text-sm font-semibold text-muted-foreground">Requirement brief</span>
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-primary md:text-5xl">{item.title}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{item.description}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <RequirementStat icon={IndianRupee} label="Budget" value={`${money(item.budget_min)} - ${money(item.budget_max)}`} />
                <RequirementStat icon={CalendarDays} label="Deadline" value={dateLabel(item.deadline)} />
                <RequirementStat icon={Sparkles} label="Status" value={item.status} />
              </div>
              <div className="mt-8 rounded-lg border border-white/80 bg-white/60 p-5 shadow-[0_18px_44px_rgba(31,44,119,0.08)] backdrop-blur">
                <div className="flex items-center gap-3 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="font-bold">Quote preview</h2>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{selectedPrice ? money(selectedPrice) : "--"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timeline</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{selectedDays ? `${selectedDays} days` : "--"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revisions</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{selectedRevisions ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Message</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{Math.min(message.length, 140)}/140</p>
                  </div>
                </div>
              </div>
            </section>
            <RoleGuard roles={["CREATOR"]} fallback={<Card><CardContent><p className="font-semibold text-primary">Creators can submit quotations after login.</p></CardContent></Card>}>
              <Card className="sticky top-24 h-fit border-white/80 bg-white/90 shadow-[0_26px_70px_rgba(31,44,119,0.18)] backdrop-blur hover:-translate-y-0">
                <CardContent className="p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold uppercase text-muted-foreground">Creator proposal</p>
                      <h2 className="mt-2 text-2xl font-bold text-primary">Send quotation</h2>
                    </div>
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary">
                      <Send className="h-5 w-5" />
                    </span>
                  </div>
                  {myQuotations.isLoading ? <LoadingState /> : existingQuotation ? (
                    <div className="mt-6">
                      <QuotationCard quotation={existingQuotation} onDelete={existingQuotation.status === "ACCEPTED" ? undefined : () => deleteQuote.mutate(existingQuotation.id)} />
                    </div>
                  ) : !canQuote ? (
                    <div className="mt-6 rounded-lg border border-border bg-muted/60 p-4">
                      <p className="font-semibold text-primary">This requirement is already in progress.</p>
                      <p className="mt-1 text-sm text-muted-foreground">Creators can send quotations only while a requirement is open.</p>
                    </div>
                  ) : (
                  <form className="mt-6 grid gap-5" onSubmit={handleSubmit((values) => quote.mutate(values, { onSuccess: () => reset() }), showFormValidationToast)}>
                  <FormField label="Proposed price" error={errors.proposed_price}>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-14 pl-10 text-lg font-bold text-primary" type="number" min="1" {...register("proposed_price")} />
                    </div>
                  </FormField>
                  {pricePresets.length ? (
                    <div className="flex flex-wrap gap-2">
                      {pricePresets.map((price) => (
                        <Button key={price} type="button" variant="outline" size="sm" onClick={() => setQuoteValue("proposed_price", price)}>
                          {money(price)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  <FormField label="Estimated days" error={errors.estimated_days}>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="h-14 pl-10 text-lg font-bold text-primary" type="number" min="1" {...register("estimated_days")} />
                    </div>
                  </FormField>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 7, 14, 30].map((days) => (
                      <Button key={days} type="button" variant="outline" size="sm" onClick={() => setQuoteValue("estimated_days", days)}>
                        {days}d
                      </Button>
                    ))}
                  </div>
                  <FormField label="Revisions included" error={errors.revisions_allowed} description="How many change requests are included in this quote.">
                    <Input className="h-14 text-lg font-bold text-primary" type="number" min="0" max="20" defaultValue="0" {...register("revisions_allowed")} />
                  </FormField>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((revisions) => (
                      <Button key={revisions} type="button" variant="outline" size="sm" onClick={() => setQuoteValue("revisions_allowed", revisions)}>
                        {revisions}
                      </Button>
                    ))}
                  </div>
                  <FormField label="Message" error={errors.message}>
                    <Textarea className="min-h-36 resize-none leading-6" maxLength={140} {...register("message")} />
                  </FormField>
                  <div className="rounded-lg border border-border bg-muted/60 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">Quote total</span>
                      <span className="font-bold text-primary">{selectedPrice ? money(selectedPrice) : "--"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">Delivery</span>
                      <span className="font-bold text-primary">{selectedDays ? `${selectedDays} days` : "--"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-muted-foreground">Revisions</span>
                      <span className="font-bold text-primary">{selectedRevisions ?? 0}</span>
                    </div>
                  </div>
                  <Button className="h-12 text-base" disabled={quote.isPending}>
                    <Send className="h-4 w-4" />
                    {quote.isPending ? "Sending..." : "Submit quotation"}
                  </Button>
                  </form>
                  )}
                </CardContent>
              </Card>
            </RoleGuard>
          </div>
        )}
      </main>
      <Footer />
    </ProtectedRoute>
  );
}

export function MyRequirementsPage() {
  const query = useApiQuery(queryKeys.myRequirements, requirementService.my);
  return <ProtectedRoute roles={["CUSTOMER"]}><DashboardShell><div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-primary">My Requirements</h1><Button asChild variant="accent"><Link href="/dashboard/customer/requirements/new">Create</Link></Button></div><div className="mt-6 grid gap-5">{query.isLoading ? <LoadingState /> : asArray(query.data).length ? asArray(query.data).map((item) => {
    const hasWorkspace = item.status !== "OPEN";
    const workspaceHref = item.order_id ? `/orders/${item.order_id}` : "/workspaces";
    return <RequirementCard key={item.id} requirement={item} href={hasWorkspace ? workspaceHref : `/dashboard/customer/requirements/${item.id}`} actionLabel={hasWorkspace ? "View workspace" : "View quotations"} />;
  }) : <EmptyState title="No requirements posted" />}</div></DashboardShell></ProtectedRoute>;
}

export function RequirementFormPage() {
  const router = useRouter();
  const create = useApiMutation(requirementService.create, { successMessage: "Requirement created", invalidate: queryKeys.myRequirements, onSuccess: () => router.push("/dashboard/customer/requirements") });
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(requirementSchema) });
  const [referencePhoto, setReferencePhoto] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const minDeadline = todayDateInputValue();

  const handleReferencePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      showFormValidationToast({ ai_generated_reference: { message: "Photo must be under 5 MB" } });
      event.target.value = "";
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await uploadService.uploadFile(file, "requirements");
      setReferencePhoto(uploadedUrl || "");
    } catch {
      showFormValidationToast({ ai_generated_reference: { message: "Photo upload failed" } });
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const submitRequirement = (values) => {
    const detailLines = [
      values.category?.trim() ? `Item type: ${values.category.trim()}` : null,
      values.material?.trim() ? `Material preference: ${values.material.trim()}` : null,
      values.size?.trim() ? `Size / dimensions: ${values.size.trim()}` : null,
      values.style?.trim() ? `Preferred style: ${values.style.trim()}` : null,
      values.notes?.trim() ? `Extra notes: ${values.notes.trim()}` : null,
    ].filter(Boolean);

    const payload = {
      ...values,
      description: [values.description?.trim(), ...detailLines].filter(Boolean).join("\n\n"),
      ai_generated_reference: referencePhoto || values.ai_generated_reference || undefined,
    };

    create.mutate(payload);
  };

  return (
    <ProtectedRoute roles={["CUSTOMER"]}>
      <DashboardShell>
        <Card>
          <CardContent>
            <h1 className="text-3xl font-bold text-primary">Create Requirement</h1>
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit(submitRequirement, showFormValidationToast)}>
              <FormField label="Title" required error={errors.title}>
                <Input {...register("title")} />
              </FormField>
              <FormField label="Description" required description="Describe what you need, including the kind of handmade item you want." error={errors.description}>
                <Textarea {...register("description")} />
              </FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Budget min" required error={errors.budget_min}>
                  <Input type="number" {...register("budget_min")} />
                </FormField>
                <FormField label="Budget max" required error={errors.budget_max}>
                  <Input type="number" {...register("budget_max")} />
                </FormField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Item type" description="Painting, pottery, planter, basket, decor, etc." error={errors.category}>
                  <Input placeholder="Handmade pottery, planter, painting..." {...register("category")} />
                </FormField>
                <FormField label="Material preference" description="Ceramic, clay, brass, wood, fabric, etc." error={errors.material}>
                  <Input placeholder="Clay, aluminium, wood..." {...register("material")} />
                </FormField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Size / dimensions" error={errors.size}>
                  <Input placeholder="Small, 12x18 inches, 20 cm..." {...register("size")} />
                </FormField>
                <FormField label="Preferred style" error={errors.style}>
                  <Input placeholder="Minimal, rustic, modern, traditional..." {...register("style")} />
                </FormField>
              </div>
              <FormField label="Reference photo" description="Upload a real photo or an AI-generated reference image for the handmade item." error={errors.ai_generated_reference}>
                <input type="file" accept="image/*" onChange={handleReferencePhoto} disabled={isUploadingPhoto} className="rounded-lg border border-border bg-muted px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60" />
                {isUploadingPhoto ? <p className="text-xs font-normal text-muted-foreground">Uploading photo...</p> : referencePhoto ? <p className="text-xs font-normal text-muted-foreground">Photo attached and ready to submit.</p> : null}
              </FormField>
              <FormField label="Extra notes" description="Optional details such as colors, use case, or delivery preference." error={errors.notes}>
                <Textarea {...register("notes")} />
              </FormField>
              <FormField label="Deadline" error={errors.deadline}>
                <Input type="date" min={minDeadline} {...register("deadline")} />
              </FormField>
              <Button disabled={create.isPending}>Create requirement</Button>
            </form>
          </CardContent>
        </Card>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function CustomerRequirementDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const query = useApiQuery(queryKeys.requirement(id), () => requirementService.details(id), { enabled: Boolean(id) });
  const remove = useApiMutation(() => requirementService.remove(id), { successMessage: "Requirement deleted", invalidate: queryKeys.myRequirements, onSuccess: () => router.push("/dashboard/customer/requirements") });
  const addRef = useApiMutation((payload) => requirementService.references(id, payload), { successMessage: "Reference added", invalidate: queryKeys.requirement(id) });
  const item = query.data ?? {};
  const hasWorkspace = item.status !== "OPEN";
  const workspaceHref = item.order_id ? `/orders/${item.order_id}` : "/workspaces";
  return <ProtectedRoute roles={["CUSTOMER"]}><DashboardShell><div className="grid gap-6">{query.isLoading ? <LoadingState /> : <Card><CardContent><h1 className="text-3xl font-bold text-primary">{item.title}</h1><p className="mt-3 text-muted-foreground">{item.description}</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild variant="outline"><Link href={hasWorkspace ? workspaceHref : `/dashboard/customer/requirements/${id}/quotations`}>{hasWorkspace ? "View workspace" : "View quotations"}</Link></Button>{hasWorkspace ? null : <Button variant="outline" onClick={() => remove.mutate()}>Delete</Button>}</div></CardContent></Card>}</div></DashboardShell></ProtectedRoute>;
}

export function RequirementQuotationsPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const query = useApiQuery(queryKeys.quotations(id), () => requirementService.quotations(id), { enabled: Boolean(id) });
  const accept = useApiMutation(quotationService.accept, {
    successMessage: "Payment checkout ready",
    invalidate: queryKeys.quotations(id),
  });
  const createPayment = useApiMutation(paymentService.create, { successMessage: "Payment started" });
  const verifyPayment = useApiMutation(({ paymentId, payload }) => paymentService.verify(paymentId, payload), { successMessage: "Payment successful", invalidate: [queryKeys.quotations(id), queryKeys.myRequirements, queryKeys.payments] });
  const reject = useApiMutation(quotationService.reject, { successMessage: "Quotation rejected", invalidate: queryKeys.quotations(id) });
  const quotations = asArray(query.data);
  const hasLockedQuotation = quotations.some((quotation) => quotation.order_id);

  const openUpfrontCheckout = async (order, quotation) => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      showFormValidationToast({ payment: { message: "Razorpay public key is not configured" } });
      return;
    }
    const amount = Number(order.total_amount ?? quotation.proposed_price ?? 0);
    const loaded = await loadRazorpayCheckout();
    if (!loaded) {
      showFormValidationToast({ payment: { message: "Razorpay checkout could not be loaded" } });
      return;
    }
    createPayment.mutate({ order_id: order.id, amount, payment_method: "project_upfront" }, {
      onSuccess: (payment) => {
        const checkout = new window.Razorpay({
          key: razorpayKey,
          amount: Math.round(Number(payment.amount) * 100),
          currency: "INR",
          name: "SrijanSetu",
          description: "Full project amount upfront",
          order_id: payment.razorpay_order_id,
          method: {
            upi: true,
          },
          config: RAZORPAY_UPI_DISPLAY_CONFIG,
          prefill: {
            name: user?.full_name || "",
            email: user?.email || "",
          },
          theme: { color: "#1f2c77" },
          modal: {
            ondismiss: () => {
              showFormValidationToast({ payment: { message: "Payment was cancelled" } });
            },
          },
          handler: (response) => {
            verifyPayment.mutate({
              paymentId: payment.id,
              payload: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                status: "SUCCESS",
              },
            }, { onSuccess: () => router.push(`/orders/${order.id}`) });
          },
        });
        checkout.on("payment.failed", (response) => {
          showFormValidationToast({ payment: { message: response.error?.description || "Payment failed" } });
        });
        checkout.open();
      },
    });
  };

  const acceptAndPay = (quotation) => {
    if (quotation.order_id && quotation.order_status === "PENDING") {
      openUpfrontCheckout({ id: quotation.order_id, total_amount: quotation.proposed_price }, quotation);
      return;
    }
    accept.mutate(quotation.id, { onSuccess: (order) => openUpfrontCheckout(order, quotation) });
  };

  return <ProtectedRoute roles={["CUSTOMER"]}><DashboardShell><h1 className="text-3xl font-bold text-primary">Quotations Received</h1><div className="mt-6 grid gap-4">{query.isLoading ? <LoadingState /> : quotations.length ? quotations.map((quotation) => {
    const canPayDeposit = quotation.order_status === "PENDING" || (!hasLockedQuotation && quotation.status === "PENDING");
    return <QuotationCard key={quotation.id} quotation={quotation} onAccept={canPayDeposit ? () => acceptAndPay(quotation) : undefined} onReject={!hasLockedQuotation && quotation.status === "PENDING" ? () => reject.mutate(quotation.id) : undefined} />;
  }) : <EmptyState title="No quotations yet" />}</div></DashboardShell></ProtectedRoute>;
}
