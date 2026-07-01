"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function formatValidationError(error) {
  const message = error?.msg ?? error?.message;
  if (!message) return "";

  const loc = Array.isArray(error?.loc) ? error.loc.filter((part) => !["body", "query", "path"].includes(part)) : [];
  const field = loc.length ? `${loc.join(".")}: ` : "";
  return `${field}${String(message).replace(/^Value error, /, "")}`;
}

function getApiErrorMessage(error) {
  const data = error.response?.data;
  const validationMessages = data?.errors?.map(formatValidationError).filter(Boolean);

  if (data?.message && data.message !== "Validation error") return data.message;
  if (validationMessages?.length) return validationMessages.join("; ");
  return data?.message ?? "Request failed";
}

function collectFormErrorMessages(errors) {
  return Object.values(errors ?? {}).flatMap((error) => {
    if (!error) return [];
    if (error.message) return [error.message];
    if (typeof error === "object") return collectFormErrorMessages(error);
    return [];
  });
}

export function showFormValidationToast(errors) {
  const messages = collectFormErrorMessages(errors);
  toast.error(messages[0] ?? "Please check the form and try again");
}

export function useApiQuery(key, fn, options = {}) {
  return useQuery({ queryKey: key, queryFn: fn, ...options });
}

export function useApiMutation(fn, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onMutate: options.onMutate,
    onSuccess: async (data, variables, context) => {
      if (options.successMessage) toast.success(options.successMessage);
      const invalidations = Array.isArray(options.invalidate?.[0]) ? options.invalidate : options.invalidate ? [options.invalidate] : [];
      await Promise.all(invalidations.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      await options.onSuccess?.(data, variables, context);
    },
    onError: (error) => {
      if (options.showErrorToast !== false) toast.error(getApiErrorMessage(error));
      options.onError?.(error);
    },
  });
}
