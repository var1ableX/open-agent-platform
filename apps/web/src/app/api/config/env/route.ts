import { NextResponse } from "next/server";

/**
 * API route to fetch environment variables.
 * Only returns NEXT_PUBLIC_* variables for security.
 */
export async function GET() {
  // List of environment variable keys to expose
  const envVarKeys = [
    "NEXT_PUBLIC_BASE_API_URL",
    "NEXT_PUBLIC_USE_LANGSMITH_AUTH",
    "NEXT_PUBLIC_DEPLOYMENTS",
    "NEXT_PUBLIC_RAG_API_URL",
    "NEXT_PUBLIC_MCP_SERVER_URL",
    "NEXT_PUBLIC_MCP_AUTH_REQUIRED",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_GOOGLE_AUTH_DISABLED",
  ];

  // Build response with only NEXT_PUBLIC_* variables
  const envVars: Record<string, { value: string; isSet: boolean }> = {};
  
  for (const key of envVarKeys) {
    const value = process.env[key] || "";
    envVars[key] = {
      value,
      isSet: !!value,
    };
  }

  // Also include private variable keys (but not values) for reference
  const privateKeys = [
    "LANGSMITH_API_KEY",
    "OPENAI_API_KEY",
  ];

  const privateVars: Record<string, { isSet: boolean }> = {};
  for (const key of privateKeys) {
    privateVars[key] = {
      isSet: !!process.env[key],
    };
  }

  return NextResponse.json({
    public: envVars,
    private: privateVars,
  });
}

