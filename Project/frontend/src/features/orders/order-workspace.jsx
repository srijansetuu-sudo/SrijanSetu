"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ExternalLink, FileText, LinkIcon, Paperclip, Send, UserCircle } from "lucide-react";
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
import { messageService, orderService, paymentService, reviewService, uploadService } from "@/services/api-services";
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

function PersonSummary({ label, person, linkProfile = false }) {
  const content = (
    <span className="inline-flex min-w-0 items-center gap-2">
      {person?.avatar_url ? <img src={person.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <UserCircle className="h-7 w-7 shrink-0 text-muted-foreground" />}
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <span className="block truncate font-bold text-primary">{personName(person, label)}</span>
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

export function OrderWorkspacePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const messagesEnd = useRef(null);
  const socketRef = useRef(null);
  const [chatStatus, setChatStatus] = useState("connecting");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const order = useApiQuery(queryKeys.order(id), () => orderService.details(id), { enabled: Boolean(id) });
  const isPendingActivation = order.data?.status === "PENDING";
  const messages = useApiQuery(queryKeys.messages(id), () => messageService.byOrder(id), { enabled: Boolean(id) && !isPendingActivation });
  const sendMessage = useApiMutation((payload) => messageService.create({ ...payload, order_id: id }), { invalidate: queryKeys.messages(id) });
  const updateStatus = useApiMutation((status) => orderService.updateStatus(id, status), { successMessage: "Status updated", invalidate: queryKeys.order(id) });
  const createPayment = useApiMutation(paymentService.create, { successMessage: "Payment started" });
  const verifyPayment = useApiMutation(({ paymentId, payload }) => paymentService.verify(paymentId, payload), { successMessage: "Payment successful", invalidate: [queryKeys.order(id), queryKeys.payments] });
  const review = useApiMutation((payload) => reviewService.create({ ...payload, order_id: id, creator_id: order.data?.creator_id }), { successMessage: "Review submitted" });
  const messageForm = useForm({ resolver: zodResolver(messageSchema), defaultValues: { message: "", attachment_url: "", attachment_name: "" } });
  const reviewForm = useForm({ resolver: zodResolver(reviewSchema), defaultValues: { rating: 5 } });
  const attachmentUrl = messageForm.watch("attachment_url");
  const attachmentName = messageForm.watch("attachment_name");

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

  useEffect(() => {
    if (!id || !accessToken || isPendingActivation) return;

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
      const socket = new WebSocket(messageService.websocketUrl(id, accessToken));
      socketRef.current = socket;

      socket.onopen = () => {
        retryAttempt = 0;
        setChatStatus("live");
      };

      socket.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (payload.type === "message" && payload.message) appendMessage(payload.message);
      };

      socket.onclose = () => {
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
  }, [accessToken, id, isPendingActivation, queryClient]);

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

  const currentOrder = order.data ?? {};
  const creatorName = personName(currentOrder.creator, "Creator");
  const upfrontAmount = Number(currentOrder.total_amount ?? 0);

  const startRazorpayPayment = async ({ amount, paymentMethod, description }) => {
    const isLocalBypass = process.env.NODE_ENV !== "production";
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey && !isLocalBypass) {
      showFormValidationToast({ payment: { message: "Razorpay public key is not configured" } });
      return;
    }
    if (isLocalBypass) {
      createPayment.mutate({ order_id: id, amount, payment_method: paymentMethod }, {
        onSuccess: (payment) => {
          verifyPayment.mutate({
            paymentId: payment.id,
            payload: {
              razorpay_payment_id: `local_test_${payment.id}`,
              razorpay_order_id: payment.razorpay_order_id,
              status: "SUCCESS",
            },
          });
        },
      });
      return;
    }
    const loaded = await loadRazorpayCheckout();
    if (!loaded) {
      showFormValidationToast({ payment: { message: "Razorpay checkout could not be loaded" } });
      return;
    }
    createPayment.mutate({ order_id: id, amount, payment_method: paymentMethod }, {
      onSuccess: (payment) => {
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
                  {!isPendingActivation ? <RoleGuard roles={["CREATOR"]}>{["ACTIVE", "DELIVERED", "COMPLETED"].map((status) => <Button key={status} size="sm" variant="outline" onClick={() => updateStatus.mutate(status)}>{status}</Button>)}</RoleGuard> : null}
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
              </CardContent>
            </Card>
          )}

          {!isPendingActivation ? <Card>
            <CardContent>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-primary">Chat with {creatorName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Messages, images, and links stay with this workspace.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">{chatStatus}</span>
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

          {!isPendingActivation ? <RoleGuard roles={["CUSTOMER"]}>
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
