"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, HelpCircle, Mail, MessageSquare, Send } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/constants/query-keys";
import { showFormValidationToast, useApiMutation, useApiQuery } from "@/hooks/use-api";
import { asArray } from "@/lib/utils";
import { contactService, orderService } from "@/services/api-services";
import { useAuthStore } from "@/store/auth-store";

const contactSchema = z.object({
  category: z.enum(["FEEDBACK", "ORDER_COMPLAINT", "QUERY"]),
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Enter a valid email").max(255),
  subject: z.string().min(4, "Subject is too short").max(180),
  message: z.string().min(10, "Message should be at least 10 characters").max(3000),
  order_id: z.string().optional(),
}).refine((values) => values.category !== "ORDER_COMPLAINT" || Boolean(values.order_id), {
  message: "Select the related order",
  path: ["order_id"],
});

function ContactChoice({ icon: Icon, title, text }) {
  return (
    <Card>
      <CardContent>
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="mt-4 font-bold text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-primary">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-semibold text-red-600">{error.message}</span> : null}
    </label>
  );
}

export function ContactPage() {
  const { isAuthenticated, user } = useAuthStore();
  const orders = useApiQuery(queryKeys.orders, orderService.list, { enabled: isAuthenticated });
  const orderItems = asArray(orders.data);
  const submit = useApiMutation(contactService.create, { successMessage: "Thanks, your message has been sent" });
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      category: "QUERY",
      name: user?.full_name ?? "",
      email: user?.email ?? "",
      subject: "",
      message: "",
      order_id: "",
    },
  });
  const category = watch("category");

  useEffect(() => {
    if (user?.full_name) setValue("name", user.full_name);
    if (user?.email) setValue("email", user.email);
  }, [setValue, user?.email, user?.full_name]);

  const onSubmit = (values) => {
    submit.mutate(
      { ...values, order_id: values.order_id || undefined },
      { onSuccess: () => reset({ category: "QUERY", name: user?.full_name ?? "", email: user?.email ?? "", subject: "", message: "", order_id: "" }) }
    );
  };

  return (
    <>
      <Navbar />
      <main className="container-page py-10">
        <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Contact us</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight text-primary">Tell us what needs attention.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Send site feedback, raise an order complaint, or ask a question. Complaints stay connected to your order so the admin team can review them clearly.
            </p>
            <div className="mt-6 grid gap-4">
              <ContactChoice icon={MessageSquare} title="Site feedback" text="Share improvements, bugs, or ideas that would make SrijanSetu better." />
              <ContactChoice icon={AlertTriangle} title="Order complaint" text="Logged-in customers and creators can attach a workspace order to a complaint." />
              <ContactChoice icon={HelpCircle} title="General query" text="Ask about using the site, payments, creators, requirements, or your account." />
            </div>
          </div>

          <Card>
            <CardContent>
              <form className="grid gap-5" onSubmit={handleSubmit(onSubmit, showFormValidationToast)}>
                <Field label="Reason" error={errors.category}>
                  <select className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4" {...register("category")}>
                    <option value="QUERY">General query</option>
                    <option value="FEEDBACK">Site feedback</option>
                    <option value="ORDER_COMPLAINT">Order complaint</option>
                  </select>
                </Field>

                {category === "ORDER_COMPLAINT" ? (
                  !isAuthenticated ? (
                    <div className="rounded-lg border border-border bg-muted/70 p-4 text-sm text-muted-foreground">
                      Please <Link href="/login" className="font-bold text-primary">login</Link> to raise an order complaint.
                    </div>
                  ) : orders.isLoading ? (
                    <LoadingState />
                  ) : orderItems.length ? (
                    <Field label="Related order" error={errors.order_id}>
                      <select className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4" {...register("order_id")}>
                        <option value="">Select order</option>
                        {orderItems.map((order) => (
                          <option key={order.id} value={order.id}>{order.requirement_title || "Order"} - {order.status}</option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <EmptyState title="No orders found" description="Order complaints need an existing workspace order." />
                  )
                ) : null}

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Name" error={errors.name}><Input placeholder="Your name" {...register("name")} /></Field>
                  <Field label="Email" error={errors.email}><Input type="email" placeholder="you@example.com" {...register("email")} /></Field>
                </div>
                <Field label="Subject" error={errors.subject}><Input placeholder="How can we help?" {...register("subject")} /></Field>
                <Field label="Message" error={errors.message}><Textarea placeholder="Write the details here" {...register("message")} /></Field>

                <Button className="h-12" disabled={submit.isPending || (category === "ORDER_COMPLAINT" && !isAuthenticated)}>
                  {submit.isPending ? "Sending..." : "Send message"}
                  {!submit.isPending ? <Send className="h-4 w-4" /> : null}
                </Button>
              </form>
              <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>We will use this information only to respond to your request.</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}
