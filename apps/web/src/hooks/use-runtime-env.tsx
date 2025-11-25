"use client";

import { useState, useEffect } from "react";

interface RuntimeEnvValues {
  mcpServerUrl: string | null;
  mcpAuthRequired: boolean;
  ragApiUrl: string | null;
}

interface UseRuntimeEnvReturn {
  values: RuntimeEnvValues | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and cache runtime environment variable values from the server.
 * 
 * This avoids the issue where NEXT_PUBLIC_* variables are embedded at build time.
 * By fetching from a server-side API route, we always get current values.
 * 
 * @returns Object containing env values, loading state, error state, and refresh function
 */
export function useRuntimeEnv(): UseRuntimeEnvReturn {
  const [values, setValues] = useState<RuntimeEnvValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvValues = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/config/env-values");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch env values: ${response.status}`);
      }
      
      const data = await response.json();
      setValues(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      // Set fallback values to null if fetch fails
      setValues({
        mcpServerUrl: null,
        mcpAuthRequired: false,
        ragApiUrl: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvValues();
  }, []);

  return {
    values,
    loading,
    error,
    refresh: fetchEnvValues,
  };
}

