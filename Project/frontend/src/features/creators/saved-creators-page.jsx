"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProtectedRoute } from "@/components/common/protected-route";
import { CreatorCard } from "@/components/common/cards";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useApiMutation, useApiQuery } from "@/hooks/use-api";
import { queryKeys } from "@/constants/query-keys";
import { creatorService } from "@/services/api-services";
import { asArray } from "@/lib/utils";

export function SavedCreatorsPage() {
  const query = useApiQuery(queryKeys.savedCreators, creatorService.saved);
  const remove = useApiMutation(creatorService.removeSaved, { successMessage: "Saved creator removed", invalidate: queryKeys.savedCreators });
  return (
    <ProtectedRoute roles={["CUSTOMER"]}>
      <DashboardShell>
        <h1 className="text-3xl font-bold text-primary">Saved Creators</h1>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {query.isLoading ? <LoadingState /> : asArray(query.data).length ? asArray(query.data).map((creator) => (
            <div key={creator.id ?? creator.user_id} className="grid gap-3">
              <CreatorCard creator={creator.creator ?? creator} />
              <Button variant="outline" onClick={() => remove.mutate(creator.creator_id)}>Remove</Button>
            </div>
          )) : <EmptyState title="No saved creators" />}
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
