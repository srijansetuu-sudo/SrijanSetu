"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/common/protected-route";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { orderService, adminService } from "@/services/api-services";
import { queryKeys } from "@/constants/query-keys";
import { useState as useReactState } from "react";

export default function AdminPayoutsPage() {
  const [orderId, setOrderId] = useState("");
  const orderQuery = useApiQuery(queryKeys.order(orderId), () => orderService.details(orderId), { enabled: Boolean(orderId) });
  const orderPayoutQuery = useApiQuery(queryKeys.adminOrderPayout(orderId), () => adminService.orderPayout(orderId), { enabled: Boolean(orderId) });
  const createPayout = useApiMutation((payload) => adminService.createOrderPayout(orderId, payload), { successMessage: "Payout recorded", invalidate: [queryKeys.adminPayouts, queryKeys.order(orderId), queryKeys.adminOrderPayout(orderId)] });
  const [transactionId, setTransactionId] = useReactState("");
  const [paymentMethod, setPaymentMethod] = useReactState("UPI");
  const [remarks, setRemarks] = useReactState("");

  const submit = () => {
    if (!transactionId || !paymentMethod) {
      alert("Transaction ID and payment method are required");
      return;
    }
    createPayout.mutate({ transaction_id: transactionId, payment_method: paymentMethod, remarks });
  };

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell role="ADMIN">
        <div className="container-page py-10">
          <h1 className="text-3xl font-bold text-primary">Payouts</h1>
          <div className="mt-6 grid gap-4">
            <Card>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
                  <Button onClick={() => { orderQuery.refetch(); orderPayoutQuery.refetch(); }}>Load</Button>
                </div>
              </CardContent>
            </Card>

            {orderQuery.data ? (
              <Card>
                <CardContent>
                  <p className="font-semibold">Order</p>
                  <p>Order ID: {orderQuery.data.id}</p>
                  <p>Total amount: ₹{orderQuery.data.total_amount}</p>
                  <p>Platform commission: ₹{orderQuery.data.platform_commission}</p>
                  <p>Creator receivable: ₹{(Number(orderQuery.data.total_amount) - Number(orderQuery.data.platform_commission)).toFixed(2)}</p>
                </CardContent>
              </Card>
            ) : null}

            {orderPayoutQuery.data ? (
              <Card>
                <CardContent>
                  <p className="font-semibold">Existing payout</p>
                  <pre>{JSON.stringify(orderPayoutQuery.data, null, 2)}</pre>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardContent>
                <p className="font-semibold">Record payout</p>
                <div className="grid gap-2 mt-2">
                  <Input placeholder="Transaction / UTR" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-11 rounded-lg border border-border bg-white px-3 text-sm">
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="IMPS">IMPS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                  <Input placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  <Button onClick={submit} disabled={createPayout.isPending}>Record Payout</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
