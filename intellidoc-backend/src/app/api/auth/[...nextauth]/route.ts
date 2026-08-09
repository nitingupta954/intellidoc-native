import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

function applyCors(res: Response, req: NextRequest) {
  const newHeaders = new Headers(res.headers);
  newHeaders.set("Access-Control-Allow-Origin", req.headers.get("origin") || "*");
  newHeaders.set("Access-Control-Allow-Credentials", "true");
  newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  newHeaders.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}

export async function GET(req: NextRequest) {
  const res = await handlers.GET(req);
  return applyCors(res, req);
}

export async function POST(req: NextRequest) {
  const res = await handlers.POST(req);
  return applyCors(res, req);
}
