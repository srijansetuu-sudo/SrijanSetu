"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle, ExternalLink, FileText, LinkIcon, Paperclip, Send, UserCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ProtectedRoute, RoleGuard } from "@/components/common/protected-route";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showFormValidationToast, useApiMutation, useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { disputeService, messageService, orderService, paymentService, reviewService, uploadService } from "@/services/api-services";
import { asArray, dateLabel, money } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const messageSchema = z.object({
  message: z.string().optional(),
  attachment_url: z.string().optional(),
  attachment_name: z.string().optional(),
}).refine((values) => values.message?.trim() || values.attachment_url?.trim(), {
  message: "Message or attachment is required",
  path: ["message"],
});
const reviewSchema = z.object({ rating: z.coerce.number().min(1).max(5), comment: z.string().optional() });
const disputeSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  details: z.string().min(10, "Please add at least 10 characters").max(3000),
  evidence_url: z.string().optional(),
  evidence_name: z.string().optional(),
});
const disputeResolutionSchema = z.object({
  action: z.string().min(1),
  admin_note: z.string().optional(),
});
const DISPUTE_REASONS = [
  ["QUALITY_ISSUE", "Quality issue"],
  ["MISSED_DEADLINE", "Missed deadline"],
  ["INCOMPLETE_DELIVERY", "Incomplete delivery"],
  ["PAYMENT_OR_REFUND", "Payment or refund"],
  ["COMMUNICATION_ISSUE", "Communication issue"],
  ["OTHER", "Other"],
];
const DISPUTE_RESOLUTIONS = [
  ["IN_REVIEW", "In review"],
  ["RESUME_ORDER", "Resume order"],
  ["CANCEL_ORDER", "Cancel order"],
  ["OTHER", "Other"],
];
const SUPPORT_EMAIL = "srijan.setuu@gmail.com";
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

function personName(person, fallback = "User") {
  return person?.brand_name || person?.full_name || fallback;
}

function inferAttachmentType(url = "") {
  if (url.startsWith("data:image/")) return "image";
  if (url.startsWith("data:application/pdf")) return "pdf";
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url) ? "image" : "link";
}

function isImageAttachment(message) {
  return message.attachment_type === "image" || inferAttachmentType(message.attachment_url || "") === "image";
}

function workspaceWebsocketUrl(orderId, token) {
  if (typeof window === "undefined") return "";
  const isLocalPage = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (isLocalPage) return messageService.websocketUrl(orderId, token);
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ token });
  return `${protocol}//${window.location.host}/api/v1/messages/orders/${orderId}/ws?${params}`;
}

function PersonSummary({ label, person, linkProfile = false }) {
  const address = [person?.address_line, person?.city, person?.state, person?.postal_code].filter(Boolean).join(", ");
  const content = (
    <span className="inline-flex min-w-0 items-start gap-2">
      {person?.avatar_url ? <img src={person.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <UserCircle className="h-7 w-7 shrink-0 text-muted-foreground" />}
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <span className="block truncate font-bold text-primary">{personName(person, label)}</span>
        {person?.email ? <span className="mt-1 block text-sm text-muted-foreground">{person.email}</span> : null}
        {person?.phone_number ? <span className="mt-1 block text-sm text-muted-foreground">{person.phone_number}</span> : null}
        {address ? <span className="mt-1 block text-sm text-muted-foreground">{address}</span> : null}
      </span>
    </span>
  );

  if (linkProfile && person?.creator_profile_id) {
    return (
      <Link href={`/creators/${person.creator_profile_id}`} className="block rounded-lg border border-border bg-white p-3 transition-colors hover:bg-blue-50">
        <span className="flex items-center justify-between gap-3">
          {content}
          <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
        </span>
      </Link>
    );
  }

  return <div className="rounded-lg border border-border bg-white p-3">{content}</div>;
}

function AttachmentPreview({ message }) {
  if (!message.attachment_url) return null;
  const label = message.attachment_name || message.attachment_url;
  if (isImageAttachment(message)) {
    return (
      <a href={message.attachment_url} target="_blank" className="mt-3 block overflow-hidden rounded-lg border border-border bg-muted" rel="noreferrer">
        <img src={message.attachment_url} alt="Chat attachment" className="max-h-72 w-full object-contain" />
      </a>
    );
  }
  return (
    <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold text-primary hover:bg-blue-50">
      {message.attachment_type === "link" ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      <span className="truncate">{label}</span>
    </a>
  );
}

function DisputeResolutionCard({ dispute, orderId }) {
  const updateDispute = useApiMutation(({ id, payload }) => disputeService.adminUpdate(id, payload), {
    successMessage: "Dispute updated",
    invalidate: [queryKeys.order(orderId), queryKeys.orderDisputes(orderId), queryKeys.contactSubmissions, queryKeys.adminStats],
  });
  const form = useForm({
    resolver: zodResolver(disputeResolutionSchema),
    defaultValues: {
      action: dispute.status === "RESOLVED" ? dispute.resolution || "RESUME_ORDER" : dispute.resolution === "OTHER" ? "OTHER" : "IN_REVIEW",
      admin_note: dispute.admin_note || "",
    },
  });

  const submit = (values) => {
    const action = values.action;
    const payload = {
      status: action === "RESUME_ORDER" || action === "CANCEL_ORDER" ? "RESOLVED" : "IN_REVIEW",
      resolution: action === "RESUME_ORDER" || action === "CANCEL_ORDER" || action === "OTHER" ? action : undefined,
      admin_note: values.admin_note?.trim() || undefined,
    };
    updateDispute.mutate({ id: dispute.id, payload });
  };

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-primary">{DISPUTE_REASONS.find(([value]) => value === dispute.reason)?.[1] || dispute.reason}</p>
          <p className="mt-1 text-sm text-muted-foreground">Raised by {dispute.raised_by_name || "User"} on {dateLabel(dispute.created_at)}</p>
        </div>
        <Badge variant="primary">{dispute.status}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{dispute.details}</p>
      {dispute.evidence_url ? (
        <a href={dispute.evidence_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <Paperclip className="h-4 w-4" />{dispute.evidence_name || "View evidence"}
        </a>
      ) : null}
      {dispute.admin_note ? <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground"><span className="font-semibold text-primary">Admin note:</span> {dispute.admin_note}</p> : null}
      {dispute.status !== "RESOLVED" ? (
        <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit(submit, showFormValidationToast)}>
          <select className="h-11 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-primary" {...form.register("action")}>
            {DISPUTE_RESOLUTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Textarea placeholder="Admin note for both parties" {...form.register("admin_note")} />
          <Button disabled={updateDispute.isPending}>Update dispute</Button>
        </form>
      ) : (
        <p className="mt-3 text-sm font-semibold text-primary">Resolution: {DISPUTE_RESOLUTIONS.find(([value]) => value === dispute.resolution)?.[1] || dispute.resolution}</p>
      )}
    </div>
  );
}

export function OrderWorkspacePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const messagesEnd = useRef(null);
  const socketRef = useRef(null);
  const [chatStatus, setChatStatus] = useState("connecting");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const order = useApiQuery(queryKeys.order(id), () => orderService.details(id), { enabled: Boolean(id) });
  const orderStatus = order.data?.status;
  const orderLoaded = Boolean(order.data?.id);
  const isPendingActivation = orderStatus === "PENDING";
  const isWorkspacePaused = orderStatus === "DISPUTED";
  const disputes = useApiQuery(queryKeys.orderDisputes(id), () => disputeService.byOrder(id), { enabled: Boolean(id) && orderLoaded && !isPendingActivation });
  const messages = useApiQuery(queryKeys.messages(id), () => messageService.byOrder(id), {
    enabled: Boolean(id) && !isPendingActivation && !isWorkspacePaused,
    refetchInterval: chatStatus === "live" ? false : 1500,
  });
  const sendMessage = useApiMutation((payload) => messageService.create({ ...payload, order_id: id }), { invalidate: queryKeys.messages(id) });
  const updateStatus = useApiMutation((status) => orderService.updateStatus(id, status), { successMessage: "Status updated", invalidate: queryKeys.order(id) });
  const createDispute = useApiMutation((payload) => disputeService.create(id, payload), { successMessage: "Dispute sent to admin", invalidate: [queryKeys.order(id), queryKeys.orderDisputes(id), queryKeys.contactSubmissions, queryKeys.adminStats] });
  const confirmCompletion = useApiMutation(() => orderService.confirmCompletion(id), { successMessage: "Completion confirmed", invalidate: [queryKeys.order(id), queryKeys.orders, queryKeys.myRequirements, queryKeys.payments] });
  const createPayment = useApiMutation(paymentService.create, { successMessage: "Payment started" });
  const verifyPayment = useApiMutation(({ paymentId, payload }) => paymentService.verify(paymentId, payload), { successMessage: "Payment successful", invalidate: [queryKeys.order(id), queryKeys.payments] });
  const review = useApiMutation((payload) => reviewService.create({ ...payload, order_id: id, creator_id: order.data?.creator_id }), { successMessage: "Review submitted" });
  const messageForm = useForm({ resolver: zodResolver(messageSchema), defaultValues: { message: "", attachment_url: "", attachment_name: "" } });
  const reviewForm = useForm({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 5 } });
  const disputeForm = useForm({ resolver: zodResolver(disputeSchema), defaultValues: { reason: "QUALITY_ISSUE", details: "", evidence_url: "", evidence_name: "" } });
  const attachmentUrl = messageForm.watch("attachment_url");
  const attachmentName = messageForm.watch("attachment_name");
  const disputeEvidenceUrl = disputeForm.watch("evidence_url");
  const disputeEvidenceName = disputeForm.watch("evidence_name");

  const handleAttachmentFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      messageForm.setError("attachment_url", { message: "Attachment must be under 5 MB" });
      event.target.value = "";
      return;
    }
    setIsUploadingAttachment(true);
    try {
      const uploadedUrl = await uploadService.uploadFile(file, "workspace-attachments");
      messageForm.setValue("attachment_url", uploadedUrl || "", { shouldDirty: true, shouldValidate: true });
      messageForm.setValue("attachment_name", file.name, { shouldDirty: true, shouldValidate: true });
    } catch {
      messageForm.setError("attachment_url", { message: "Attachment upload failed" });
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  };

  const handleDisputeEvidenceFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      disputeForm.setError("evidence_url", { message: "Evidence must be under 5 MB" });
      event.target.value = "";
      return;
    }
    setIsUploadingEvidence(true);
    try {
      const uploadedUrl = await uploadService.uploadFile(file, "dispute-evidence");
      disputeForm.setValue("evidence_url", uploadedUrl || "", { shouldDirty: true, shouldValidate: true });
      disputeForm.setValue("evidence_name", file.name, { shouldDirty: true, shouldValidate: true });
    } catch {
      disputeForm.setError("evidence_url", { message: "Evidence upload failed" });
    } finally {
      setIsUploadingEvidence(false);
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!id || !accessToken || order.isLoading || !orderLoaded || isPendingActivation || isWorkspacePaused) return;

    let stopped = false;
    let retryTimer = null;
    let retryAttempt = 0;

    const appendMessage = (message) => {
      queryClient.setQueryData(queryKeys.messages(id), (current) => {
        const items = asArray(current);
        if (items.some((item) => item.id === message.id)) return items;
        return [...items, message];
      });
    };

    const connect = () => {
      if (stopped) return;
      setChatStatus("connecting");
      const socket = new WebSocket(workspaceWebsocketUrl(id, accessToken));
      socketRef.current = socket;

      socket.onopen = () => {
        retryAttempt = 0;
        setChatStatus("live");
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      };

      socket.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (payload.type === "connected") {
          setChatStatus("live");
          queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
          return;
        }
        if (payload.type === "message" && payload.message) {
          setChatStatus("live");
          appendMessage(payload.message);
        }
      };

      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (stopped) return;
        setChatStatus("reconnecting");
        const delay = Math.min(10000, 1000 * 2 ** retryAttempt);
        retryAttempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [accessToken, id, isPendingActivation, isWorkspacePaused, order.isLoading, orderLoaded, queryClient]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data]);

  const submitMessage = (values) => {
    const payload = {
      message: values.message?.trim() || "",
      attachment_url: values.attachment_url?.trim() || null,
      attachment_type: values.attachment_url?.trim() ? inferAttachmentType(values.attachment_url) : null,
      attachment_name: values.attachment_name?.trim() || null,
    };
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "message", ...payload }));
      messageForm.reset({ message: "", attachment_url: "", attachment_name: "" });
      return;
    }
    sendMessage.mutate(payload, { onSuccess: () => messageForm.reset({ message: "", attachment_url: "", attachment_name: "" }) });
  };

  const submitDispute = (values) => {
    if (!window.confirm("This will pause completion and payout until an admin reviews the dispute. Continue?")) return;
    createDispute.mutate({
      reason: values.reason,
      details: values.details.trim(),
      evidence_url: values.evidence_url?.trim() || null,
      evidence_name: values.evidence_name?.trim() || null,
    }, {
      onSuccess: () => {
        disputeForm.reset({ reason: "QUALITY_ISSUE", details: "", evidence_url: "", evidence_name: "" });
        setIsDisputeOpen(false);
      },
    });
  };

  const currentOrder = order.data ?? {};
  const creatorName = personName(currentOrder.creator, "Creator");
  const upfrontAmount = Number(currentOrder.total_amount ?? 0);
  const isDelivered = currentOrder.status === "DELIVERED";
  const isCompleted = currentOrder.status === "COMPLETED";
  const isCustomer = user?.id === currentOrder.customer_id;
  const isCreator = user?.id === currentOrder.creator_id;
  const isAdmin = user?.role === "ADMIN";
  const hasConfirmedCompletion = isCustomer ? Boolean(currentOrder.customer_completed_at) : isCreator ? Boolean(currentOrder.creator_completed_at) : false;
  const canRaiseDispute = (isCustomer || isCreator) && ["ACTIVE", "DELIVERED"].includes(currentOrder.status);
  const disputeItems = asArray(disputes.data);

  const startRazorpayPayment = async ({ amount, paymentMethod, description }) => {
    const loaded = await loadRazorpayCheckout();
    if (!loaded) {
      showFormValidationToast({ payment: { message: "Razorpay checkout could not be loaded" } });
      return;
    }
    createPayment.mutate({ order_id: id, amount, payment_method: paymentMethod }, {
      onSuccess: (payment) => {
        const razorpayKey = payment.razorpay_key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          showFormValidationToast({ payment: { message: "Razorpay public key is not configured" } });
          return;
        }
        const checkout = new window.Razorpay({
          key: razorpayKey,
          amount: Math.round(Number(payment.amount) * 100),
          currency: "INR",
          name: "SrijanSetu",
          description,
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
            });
          },
        });
        checkout.on("payment.failed", (response) => {
          showFormValidationToast({ payment: { message: response.error?.description || "Payment failed" } });
        });
        checkout.open();
      },
    });
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container-page grid gap-6 py-10">
        <section className="grid gap-6">
          {order.isLoading ? <LoadingState /> : (
            <Card>
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="truncate text-3xl font-bold text-primary">{currentOrder.requirement_title || "Order Workspace"}</h1>
                    <p className="mt-2 text-muted-foreground">{isPendingActivation ? "Workspace opens after the full quoted amount is paid upfront." : `Started ${dateLabel(currentOrder.started_at || currentOrder.created_at)}`}</p>
                  </div>
                  <Badge variant="primary">{currentOrder.status}</Badge>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div><p className="text-sm text-muted-foreground">Price</p><p className="font-bold text-primary">{money(currentOrder.total_amount)}</p></div>
                  <PersonSummary label="Customer" person={currentOrder.customer} />
                  <PersonSummary label="Creator" person={currentOrder.creator} linkProfile />
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  {!isPendingActivation ? <RoleGuard roles={["CREATOR"]}>
                    {!hasConfirmedCompletion && currentOrder.status === "ACTIVE" ? <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("DELIVERED")}>Mark delivered</Button> : null}
                  </RoleGuard> : null}
                  {!isPendingActivation && canRaiseDispute ? <Button size="sm" variant="outline" onClick={() => setIsDisputeOpen(true)}><AlertTriangle className="h-4 w-4" />Raise dispute</Button> : null}
                  {!isPendingActivation && isDelivered && (isCustomer || isCreator) && !hasConfirmedCompletion ? (
                    <Button size="sm" variant="accent" disabled={confirmCompletion.isPending} onClick={() => confirmCompletion.mutate()}>
                      Confirm completion
                    </Button>
                  ) : null}
                  <RoleGuard roles={["CUSTOMER"]}>
                    {isPendingActivation ? <div className="rounded-lg border border-border bg-muted/60 p-4 sm:col-span-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-primary">Full upfront project amount: {money(upfrontAmount)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">This amount stays with SrijanSetu until the project is completed.</p>
                        </div>
                        <Button size="sm" variant="accent" disabled={createPayment.isPending || verifyPayment.isPending} onClick={() => startRazorpayPayment({ amount: upfrontAmount, paymentMethod: "project_upfront", description: "Full project amount upfront" })}>Pay {money(upfrontAmount)}</Button>
                      </div>
                    </div> : null}
                  </RoleGuard>
                </div>
                {!isPendingActivation ? (
                  <div className="mt-6 rounded-lg border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
                    <p className="font-semibold text-primary">Delivery and payout</p>
                    <p className="mt-1">SrijanSetu currently does not support delivery logistics. Customer and creator must coordinate delivery directly; delivery support is planned for a future release.</p>
                    <p className="mt-1">{isWorkspacePaused ? `This workspace is paused while admin reviews the dispute. For further queries, email ${SUPPORT_EMAIL}.` : "The customer payment stays with SrijanSetu while work is in progress. After the creator marks the project delivered and both customer and creator confirm completion, creator payout becomes ready after platform commission deduction."}</p>
                    <p className="mt-1 font-semibold text-primary">Creator payout after commission: {money(currentOrder.creator_payout_amount)}</p>
                    {isDelivered ? <p className="mt-1 font-semibold text-primary">Customer confirmation: {currentOrder.customer_completed_at ? "done" : "pending"} · Creator confirmation: {currentOrder.creator_completed_at ? "done" : "pending"}</p> : null}
                    {isCompleted ? <p className="mt-1 font-semibold text-primary">Project completed. Creator payout is ready after commission deduction.</p> : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {isDisputeOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-primary/40 px-4 py-6">
              <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Raise dispute</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Admin will be notified and completion or payout will stay paused while this is reviewed.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setIsDisputeOpen(false)}>Close</Button>
                </div>
                <form className="mt-5 grid gap-3" onSubmit={disputeForm.handleSubmit(submitDispute, showFormValidationToast)}>
                  <select className="h-11 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-primary" {...disputeForm.register("reason")}>
                    {DISPUTE_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <Textarea placeholder="Describe what happened and what you want admin to review" {...disputeForm.register("details")} />
                  <div className="flex flex-wrap items-center gap-3">
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-blue-50 ${isUploadingEvidence ? "cursor-not-allowed opacity-60" : ""}`}>
                      <Paperclip className="h-4 w-4" />Attach evidence
                      <input type="file" className="hidden" onChange={handleDisputeEvidenceFile} disabled={isUploadingEvidence} />
                    </label>
                    {isUploadingEvidence ? <span className="text-sm font-semibold text-muted-foreground">Uploading evidence...</span> : disputeEvidenceUrl ? <span className="text-sm font-semibold text-muted-foreground">{disputeEvidenceName || "Evidence attached"}</span> : null}
                  </div>
                  <div className="rounded-lg border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
                    Raising a dispute pauses normal completion and payout handling until an admin reviews it. Keep all follow-up communication in the workspace chat.
                  </div>
                  <Button disabled={createDispute.isPending || isUploadingEvidence}>Send dispute to admin</Button>
                </form>
              </div>
            </div>
          ) : null}

          {!isPendingActivation && disputeItems.length ? (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold text-primary">Dispute history</h2>
                </div>
                <div className="mt-4 grid gap-4">
                  {disputeItems.map((dispute) => (
                    isAdmin ? <DisputeResolutionCard key={dispute.id} dispute={dispute} orderId={id} /> : (
                      <div key={dispute.id} className="rounded-lg border border-border bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-primary">{DISPUTE_REASONS.find(([value]) => value === dispute.reason)?.[1] || dispute.reason}</p>
                            <p className="mt-1 text-sm text-muted-foreground">Raised by {dispute.raised_by_name || "User"} on {dateLabel(dispute.created_at)}</p>
                          </div>
                          <Badge variant="primary">{dispute.status}</Badge>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{dispute.details}</p>
                        {dispute.evidence_url ? <a href={dispute.evidence_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><Paperclip className="h-4 w-4" />{dispute.evidence_name || "View evidence"}</a> : null}
                        {dispute.admin_note ? <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground"><span className="font-semibold text-primary">Admin note:</span> {dispute.admin_note}</p> : null}
                        {dispute.status === "RESOLVED" && dispute.resolution ? <p className="mt-3 text-sm font-semibold text-primary">Resolution: {DISPUTE_RESOLUTIONS.find(([value]) => value === dispute.resolution)?.[1] || dispute.resolution}</p> : null}
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isWorkspacePaused ? (
            <Card>
              <CardContent>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h2 className="text-xl font-bold text-primary">Workspace paused</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Admin is reviewing this dispute. Work, chat, completion, and payout actions are paused until admin resumes the order.</p>
                    <p className="mt-2 text-sm font-semibold text-primary">For further queries, email {SUPPORT_EMAIL}.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!isPendingActivation && !isWorkspacePaused ? <Card>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-primary">Chat with {creatorName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Messages, images, and links stay with this workspace.</p>
                </div>
              </div>
              <div className="mt-4 max-h-[520px] overflow-y-auto rounded-lg bg-muted p-4">
                {asArray(messages.data).length ? asArray(messages.data).map((message) => {
                  const mine = message.sender_id === user?.id;
                  return (
                    <div key={message.id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-lg p-3 ${mine ? "bg-primary text-white" : "bg-white"}`}>
                        <p className={`text-xs font-semibold ${mine ? "text-white/75" : "text-muted-foreground"}`}>{message.sender_name || message.sender_id}</p>
                        {message.message ? <p className="mt-1 whitespace-pre-wrap text-sm">{message.message}</p> : null}
                        <AttachmentPreview message={message} />
                        <p className={`mt-2 text-xs ${mine ? "text-white/70" : "text-muted-foreground"}`}>{dateLabel(message.created_at)}</p>
                      </div>
                    </div>
                  );
                }) : <EmptyState title="No messages yet" />}
                <div ref={messagesEnd} />
              </div>
              <form className="mt-4 grid gap-3" onSubmit={messageForm.handleSubmit(submitMessage, showFormValidationToast)}>
                <div className="flex gap-3">
                  <Input placeholder="Write a message" {...messageForm.register("message")} />
                  <label className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-border bg-white text-primary shadow-sm transition-colors hover:bg-blue-50 ${isUploadingAttachment ? "cursor-not-allowed opacity-60" : ""}`} title="Attach file">
                    <Paperclip className="h-4 w-4" />
                    <input type="file" className="hidden" onChange={handleAttachmentFile} disabled={isUploadingAttachment} />
                  </label>
                  <Button disabled={sendMessage.isPending}><Send className="h-4 w-4" />Send</Button>
                </div>
                {isUploadingAttachment ? <p className="text-xs font-semibold text-muted-foreground">Uploading attachment...</p> : attachmentUrl ? <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Paperclip className="h-3.5 w-3.5" />{attachmentName || "Attachment selected"}</p> : null}
              </form>
            </CardContent>
          </Card> : null}

          {isCompleted ? <RoleGuard roles={["CUSTOMER"]}>
            <Card>
              <CardContent>
                <h2 className="text-xl font-bold text-primary">Review Creator</h2>
                <form className="mt-4 grid gap-3" onSubmit={reviewForm.handleSubmit((values) => review.mutate(values, { onSuccess: () => reviewForm.reset({ rating: 5 }) }), showFormValidationToast)}>
                  <Input type="number" min="1" max="5" {...reviewForm.register("rating")} />
                  <Textarea placeholder="Share your experience" {...reviewForm.register("comment")} />
                  <Button>Submit Review</Button>
                </form>
              </CardContent>
            </Card>
          </RoleGuard> : null}
        </section>
      </main>
    </ProtectedRoute>
  );
}
