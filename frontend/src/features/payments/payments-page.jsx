"use client";

import { Navbar } from "@/components/layout/navbar";
import { ProtectedRoute } from "@/components/common/protected-route";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { paymentService } from "@/services/api-services";
import { asArray, money } from "@/lib/utils";

export function PaymentsPage() {
  const query = useApiQuery(queryKeys.payments, paymentService.history);
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="container-page py-10">
        <h1 className="text-3xl font-bold text-primary">Payment History</h1>
        <div className="mt-6 grid gap-4">
          {query.isLoading ? <LoadingState /> : asArray(query.data).length ? asArray(query.data).map((payment) => (
            <Card key={payment.id}><CardContent className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-2xl font-bold text-primary">{money(payment.amount)}</p><p className="mt-1 text-sm text-muted-foreground">{payment.razorpay_payment_id ?? "Transaction pending"}</p></div><Badge variant={payment.payment_status === "SUCCESS" ? "accent" : "muted"}>{payment.payment_status}</Badge></CardContent></Card>
          )) : <EmptyState title="No payments yet" />}
        </div>
      </main>
    </ProtectedRoute>
  );
}
