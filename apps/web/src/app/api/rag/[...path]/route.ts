import { NextRequest } from "next/server";

// Use a server-side env variable for the actual RAG server location
// This should always point to localhost:8080 (where LangConnect is running)
const RAG_SERVER_URL = process.env.RAG_SERVER_URL || "http://localhost:8080";

/**
 * Proxy route for RAG server requests to handle CORS and remote access
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRagRequest(req, path, "GET");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRagRequest(req, path, "POST");
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRagRequest(req, path, "PUT");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleRagRequest(req, path, "DELETE");
}

async function handleRagRequest(
  req: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Extract the path from the URL
    const path = pathSegments.join("/");
    const targetUrl = `${RAG_SERVER_URL}/${path}`;
    
    // Get query parameters
    const url = new URL(req.url);
    const queryString = url.search;
    const fullTargetUrl = `${targetUrl}${queryString}`;

    console.warn(`[RAG Proxy] ${method} ${fullTargetUrl}`);

    // Forward headers (especially Authorization)
    const headers: HeadersInit = {};
    req.headers.forEach((value, key) => {
      // Forward important headers
      if (key.toLowerCase() === 'authorization' || 
          key.toLowerCase() === 'content-type' ||
          key.toLowerCase() === 'accept') {
        headers[key] = value;
      }
    });

    // Get request body for POST/PUT requests
    let body: BodyInit | undefined;
    if (method === "POST" || method === "PUT") {
      body = await req.text();
    }

    // Make the request to the RAG server
    const response = await fetch(fullTargetUrl, {
      method,
      headers,
      body,
    });

    // Get response data
    const responseData = await response.text();
    
    // Forward the response with proper headers
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", response.headers.get("Content-Type") || "application/json");
    
    // Add CORS headers
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("RAG proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to proxy request to RAG server" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
