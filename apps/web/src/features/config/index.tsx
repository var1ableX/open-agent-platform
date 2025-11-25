"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnvVar {
  key: string;
  value: string;
  isPublic: boolean;
  isSet: boolean;
}

interface EnvResponse {
  public: Record<string, { value: string; isSet: boolean }>;
  private: Record<string, { isSet: boolean }>;
}

export default function Config(): React.ReactNode {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [envData, setEnvData] = React.useState<EnvResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch environment variables from API route
  React.useEffect(() => {
    async function fetchEnvVars() {
      try {
        const response = await fetch("/api/config/env");
        if (!response.ok) {
          throw new Error("Failed to fetch environment variables");
        }
        const data = await response.json();
        setEnvData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchEnvVars();
  }, []);

  // Convert API response to EnvVar array
  const envVars: EnvVar[] = React.useMemo(() => {
    if (!envData) return [];
    
    const vars: EnvVar[] = [];
    
    // Add public variables
    for (const [key, data] of Object.entries(envData.public)) {
      vars.push({
        key,
        value: data.value,
        isPublic: true,
        isSet: data.isSet,
      });
    }
    
    // Add private variables (without values)
    for (const [key, data] of Object.entries(envData.private)) {
      vars.push({
        key,
        value: "",
        isPublic: false,
        isSet: data.isSet,
      });
    }
    
    return vars;
  }, [envData]);

  const handleCopy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const publicVars = envVars.filter((v) => v.isPublic);
  const privateVars = envVars.filter((v) => !v.isPublic);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading environment variables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Configuration</h1>
        <p className="text-muted-foreground">
          View your environment variables. Values are fetched server-side for accuracy.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Environment Variables</CardTitle>
          <CardDescription>
            Variables prefixed with <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_</code> are exposed to the browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {publicVars.map((envVar) => (
              <div
                key={envVar.key}
                className="flex items-start justify-between gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-semibold">{envVar.key}</code>
                    {envVar.isSet ? (
                      <Badge variant="default" className="text-xs">
                        Set
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Not Set
                      </Badge>
                    )}
                  </div>
                  {envVar.isSet ? (
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                        {envVar.value}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy(envVar.key, envVar.value)}
                      >
                        {copiedKey === envVar.key ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not configured</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Private Environment Variables</CardTitle>
          <CardDescription>
            Server-side only variables (not exposed to browser). These are shown as "Not Set" on the client side for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {privateVars.map((envVar) => (
              <div
                key={envVar.key}
                className="flex items-start justify-between gap-4 p-4 border rounded-lg"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-semibold">{envVar.key}</code>
                    <Badge variant="secondary" className="text-xs">
                      Server Only
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This variable is only available on the server side. Check your .env file or server logs to verify its value.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Environment variables are read at build/startup time. If you change values in your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file, you may need to restart your development server or rebuild your application for changes to take effect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

