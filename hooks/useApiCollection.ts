"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureApiSuccess } from "@/lib/client-api";
import type { ApiErrorMessages } from "@/lib/client-api";

type ApiCollectionOptions<T> = {
  endpoint: string;
  responseKey: string;
  isItem: (value: unknown) => value is T;
  invalidResponseMessage: string;
  fallbackErrorMessage: string;
  errorMessages: ApiErrorMessages;
  refreshIntervalMs?: number;
};

export function useApiCollection<T>({
  endpoint,
  responseKey,
  isItem,
  invalidResponseMessage,
  fallbackErrorMessage,
  errorMessages,
  refreshIntervalMs,
}: ApiCollectionOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<Promise<boolean> | null>(null);
  const mutatingRef = useRef(false);
  const mountedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshRef.current) return refreshRef.current;
    const request = (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        await ensureApiSuccess(response, errorMessages, fallbackErrorMessage);

        const body: unknown = await response.json();
        if (typeof body !== "object" || body === null) {
          throw new Error(invalidResponseMessage);
        }

        const collection = (body as Record<string, unknown>)[responseKey];
        if (!Array.isArray(collection) || !collection.every(isItem)) {
          throw new Error(invalidResponseMessage);
        }

        if (mountedRef.current) {
          setItems(collection);
          setIsAvailable(true);
        }
        return true;
      } catch (loadError) {
        if (mountedRef.current) {
          setError(
            loadError instanceof Error ? loadError.message : fallbackErrorMessage,
          );
        }
        return false;
      } finally {
        refreshRef.current = null;
        if (mountedRef.current) setIsLoading(false);
      }
    })();
    refreshRef.current = request;
    return request;
  }, [
    endpoint,
    errorMessages,
    fallbackErrorMessage,
    invalidResponseMessage,
    isItem,
    responseKey,
  ]);

  const mutate = useCallback(
    async (url: string, init: RequestInit) => {
      if (mutatingRef.current) return false;
      mutatingRef.current = true;
      setIsMutating(true);
      setError(null);

      try {
        const response = await fetch(url, init);
        await ensureApiSuccess(response, errorMessages, fallbackErrorMessage);
        if (refreshRef.current) await refreshRef.current;
        await refresh();
        return true;
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : fallbackErrorMessage,
        );
        return false;
      } finally {
        mutatingRef.current = false;
        setIsMutating(false);
      }
    },
    [errorMessages, fallbackErrorMessage, refresh],
  );

  const create = useCallback(
    (payload: unknown) =>
      mutate(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    [endpoint, mutate],
  );

  const update = useCallback(
    (id: string, payload: unknown) =>
      mutate(`${endpoint}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    [endpoint, mutate],
  );

  const remove = useCallback(
    (id: string) =>
      mutate(`${endpoint}/${encodeURIComponent(id)}`, { method: "DELETE" }),
    [endpoint, mutate],
  );

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    if (refreshIntervalMs === undefined) {
      return () => {
        mountedRef.current = false;
      };
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, refreshIntervalMs);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh, refreshIntervalMs]);

  return {
    items,
    isLoading,
    isAvailable,
    isMutating,
    error,
    setError,
    refresh,
    create,
    update,
    remove,
  };
}
