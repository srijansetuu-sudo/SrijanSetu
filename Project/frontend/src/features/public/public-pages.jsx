"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Quote } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreatorCard } from "@/components/common/cards";
import { LoadingState, EmptyState } from "@/components/common/states";
import { useApiQuery } from "@/hooks/use-api";
import { creatorService } from "@/services/api-services";
import { queryKeys } from "@/constants/query-keys";
import { asArray } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const steps = ["Customer posts a requirement", "Creators submit quotations", "Customer accepts and pays", "Creator delivers files", "Customer reviews creator"];

export function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const creators = useApiQuery(queryKeys.creators({ limit: 3 }), () => creatorService.list({ limit: 3 }), { enabled: isAuthenticated });

  return (
    <>
      <Navbar />
      <main>
        <section className="brand-hero py-16 md:py-24">
          <div className="container-page relative grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm font-bold uppercase tracking-wide text-[#1d4ed8]">From Thought To Creation</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-primary md:text-6xl">Post your idea. Find the right creator.</h1>
              <p className="mt-5 max-w-2xl text-lg text-muted-foreground">SrijanSetu helps customers share work requirements, get quotes from creators, pay safely, track delivery, and give reviews.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="primary"><Link href={isAuthenticated ? "/creators" : "/login"}>Find Creators <ArrowRight className="h-4 w-4" /></Link></Button>
                {role === "CREATOR" ? (
                  <Button asChild variant="accent"><Link href="/dashboard/creator/requirements">Browse Requirements</Link></Button>
                ) : (
                  <Button asChild variant="accent"><Link href="/dashboard/customer/requirements/new">Post Requirement</Link></Button>
                )}
              </div>
            </motion.div>
            <div className="surface rounded-lg border-white/80 bg-white/75 p-6">
              <Image src="/srijansetu-logo.png" alt="SrijanSetu logo" width={560} height={560} className="mx-auto rounded-lg" priority />
            </div>
          </div>
        </section>

        <section className="section-band py-14">
          <div className="container-page">
            <h2 className="text-3xl font-bold text-primary">How it works</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              {steps.map((step, index) => (
                <Card key={step}><CardContent><CheckCircle2 className="h-5 w-5 text-primary" /><p className="mt-4 text-sm font-semibold">{index + 1}. {step}</p></CardContent></Card>
              ))}
            </div>
          </div>
        </section>

        {isAuthenticated ? (
          <section className="container-page py-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-primary">Featured Creators</h2>
              <Link className="text-sm font-semibold text-primary" href="/creators">View all</Link>
            </div>
            {creators.isLoading ? <LoadingState /> : asArray(creators.data).length ? <div className="grid gap-5 md:grid-cols-3">{asArray(creators.data).slice(0, 3).map((creator) => <CreatorCard key={creator.id ?? creator.user_id} creator={creator} />)}</div> : <EmptyState title="No creators yet" />}
          </section>
        ) : null}

        <section className="container-page py-14">
          <div className="grid gap-5 md:grid-cols-3">
            {["Clear quotes", "Safe payments", "Easy delivery tracking"].map((text) => (
              <Card key={text}><CardContent><Quote className="h-5 w-5 text-accent" /><p className="mt-3 font-semibold text-primary">{text}</p><p className="mt-2 text-sm text-muted-foreground">Everything stays in one place from the first requirement to the final review.</p></CardContent></Card>
            ))}
          </div>
        </section>

        <section className="container-page py-8">
          <h2 className="text-3xl font-bold text-primary">FAQ</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {["How do I choose a creator?", "Can creators send quotations?", "Where do order files live?", "How are reviews submitted?"].map((q) => (
              <Card key={q}><CardContent><p className="font-semibold text-primary">{q}</p><p className="mt-2 text-sm text-muted-foreground">Use the connected dashboard workflows to manage each step through the backend API.</p></CardContent></Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
