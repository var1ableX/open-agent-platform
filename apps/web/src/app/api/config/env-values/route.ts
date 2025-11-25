import { NextResponse } from "next/server";

/**
 * API route to provide current runtime environment variable values.
 * Only returns NEXT_PUBLIC_* variables for security (these are safe to expose).
 * 
 * This allows client-side code to access current env values without
 * relying on build-time embedded values.
 */
export async function GET() {
  return NextResponse.json({
    mcpServerUrl: process.env.NEXT_PUBLIC_MCP_SERVER_URL || null,
    mcpAuthRequired: process.env.NEXT_PUBLIC_MCP_AUTH_REQUIRED === "true",
    ragApiUrl: process.env.NEXT_PUBLIC_RAG_API_URL || null,
  });
}

