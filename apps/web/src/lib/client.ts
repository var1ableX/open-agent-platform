import { Client } from "@langchain/langgraph-sdk";
import { getDeployments } from "./environment/deployments";

export function createClient(deploymentId: string, accessToken?: string) {
  const deployment = getDeployments().find((d) => d.id === deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  // Always use proxy route in browser to avoid localhost issues on remote devices
  if (typeof window !== "undefined") {
    const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
    if (!baseApiUrl) {
      throw new Error(
        "Failed to create client: Base API URL not configured. Please set NEXT_PUBLIC_BASE_API_URL",
      );
    }
    
    // Convert relative URL to absolute URL for LangGraph Client
    const absoluteApiUrl = new URL(
      `${baseApiUrl}/langgraph/proxy/${deploymentId}`,
      window.location.origin
    ).toString();
    
    const client = new Client({
      apiUrl: absoluteApiUrl,
      defaultHeaders: {
        "x-auth-scheme": "langsmith",
      },
    });
    return client;
  }

  // Server-side: use direct connection
  if (!accessToken || process.env.NEXT_PUBLIC_USE_LANGSMITH_AUTH === "true") {
    const client = new Client({
      apiUrl: deployment.deploymentUrl,
      apiKey: process.env.LANGSMITH_API_KEY,
      defaultHeaders: {
        "x-auth-scheme": "langsmith",
      },
    });
    return client;
  }

  const client = new Client({
    apiUrl: deployment.deploymentUrl,
    defaultHeaders: {
      Authorization: `Bearer ${accessToken}`,
      "x-supabase-access-token": accessToken,
    },
  });
  return client;
}
