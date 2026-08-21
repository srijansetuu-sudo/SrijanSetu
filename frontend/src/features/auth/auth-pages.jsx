"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, Palette, ShieldCheck, Sparkles, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin, useSignup } from "@/features/auth/use-auth";
import { Navbar } from "@/components/layout/navbar";
import { showFormValidationToast } from "@/hooks/use-api";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = loginSchema.extend({
  full_name: z.string().min(2),
  confirm_password: z.string().min(6),
  role: z.enum(["CUSTOMER", "CREATOR"]),
}).refine((values) => values.password === values.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

const authHighlights = [
  "Post your work requirement",
  "Get quotes from creators",
  "Pay, track delivery, and review",
];

function Field({ label, icon: Icon, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-primary">
      <span className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[#1d4ed8]" /> : null}
        {label}
      </span>
      <span className="block">{children}</span>
    </label>
  );
}

function AuthFrame({ mode, title, subtitle, children, footer }) {
  const isSignup = mode === "signup";
  return (
    <>
      <Navbar />
      <main className="auth-shell">
        <div className="container-page relative grid min-h-[calc(100vh-64px)] items-start gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-bold text-primary shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-[#d9ad00]" />
                From Thought To Creation
              </div>
              <h1 className="mt-6 text-5xl font-bold leading-tight text-primary">
                {isSignup ? "Find the right creator for your work." : "Continue your creative work."}
              </h1>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                SrijanSetu helps customers post work and helps creators send quotes. You can choose the best creator, pay safely, track delivery, and give a review.
              </p>
              <div className="mt-8 grid gap-3">
                {authHighlights.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1d4ed8]" />
                    <span className="font-semibold text-primary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[520px] overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_28px_80px_rgba(31,44,119,0.16)]">
            <div className="h-2 bg-gradient-to-r from-[#1d4ed8] via-[#f7cf18] to-[#1f2c77]" />
            <div className="p-5 sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-primary">{title}</h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#fff2a3] text-primary shadow-inner">
                  {isSignup ? <Palette className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                </div>
              </div>
              {children}
              {footer}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export function LoginPage() {
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });

  return (
    <AuthFrame
      mode="login"
      title="Login"
      subtitle="Open your dashboard to manage work, quotes, payments, and delivery."
      footer={<p className="mt-5 text-sm text-muted-foreground">New here? <Link className="font-semibold text-primary hover:text-[#1d4ed8]" href="/signup">Create an account</Link></p>}
    >
      <form className="grid gap-4" noValidate onSubmit={handleSubmit((values) => login.mutate(values), showFormValidationToast)}>
        <Field label="Email" error={errors.email} icon={Mail}><Input type="email" placeholder="you@example.com" {...register("email")} /></Field>
        <Field label="Password" error={errors.password} icon={LockKeyhole}><Input type="password" placeholder="Minimum 6 characters" {...register("password")} /></Field>
        <Button type="submit" className="mt-2 w-full text-white" disabled={login.isPending}>
          {login.isPending ? "Signing in..." : "Login"}
          {!login.isPending ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function SignupPage() {
  const signup = useSignup();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(signupSchema), defaultValues: { role: "CUSTOMER" } });
  const submitSignup = ({ confirm_password, ...values }) => signup.mutate(values);

  return (
    <AuthFrame
      mode="signup"
      title="Create account"
      subtitle="Join as a customer who needs work done or as a creator who wants to take work."
      footer={<p className="mt-5 text-sm text-muted-foreground">Already have an account? <Link className="font-semibold text-primary hover:text-[#1d4ed8]" href="/login">Login</Link></p>}
    >
      <form className="grid gap-4" onSubmit={handleSubmit(submitSignup, showFormValidationToast)}>
        <Field label="Full name" error={errors.full_name} icon={UserRound}><Input placeholder="Your name" {...register("full_name")} /></Field>
        <Field label="Email" error={errors.email} icon={Mail}><Input type="email" placeholder="you@example.com" {...register("email")} /></Field>
        <Field label="Password" error={errors.password} icon={LockKeyhole}><Input type="password" placeholder="Minimum 6 characters" {...register("password")} /></Field>
        <Field label="Verify password" error={errors.confirm_password} icon={LockKeyhole}><Input type="password" placeholder="Re-enter your password" {...register("confirm_password")} /></Field>
        <Field label="Role" error={errors.role} icon={UsersRound}>
          <select className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4" {...register("role")}>
            <option value="CUSTOMER">Customer</option>
            <option value="CREATOR">Creator</option>
          </select>
        </Field>
        <Button className="mt-2 w-full text-white" disabled={signup.isPending}>
          {signup.isPending ? "Creating..." : "Sign up"}
          {!signup.isPending ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </AuthFrame>
  );
}
