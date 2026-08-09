import { NextResponse, type NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  // Check if it's localhost (any port) or 172.x or 192.x
  const isAllowedOrigin = origin.match(/^http:\/\/localhost:\d+$/) || 
                          origin.match(/^http:\/\/172\.\d+\.\d+\.\d+:\d+$/) ||
                          origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) ||
                          origin === "http://localhost:8081" ||
                          origin === "http://localhost:8082" ||
                          origin === "http://localhost:8083";

  const allowedOrigin = isAllowedOrigin ? origin : "http://localhost:8081";

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Mobile-Cookie",
    "Access-Control-Allow-Credentials": "true",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return NextResponse.json({}, { 
      headers: { ...corsHeaders, "Vary": "Origin" } 
    });
  }

  // NextAuth v5 stores the JWT session in this cookie
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboardPage = pathname.startsWith("/dashboard") || 
                          pathname.startsWith("/documents") ||
                          pathname.startsWith("/chat") ||
                          pathname.startsWith("/knowledge-bases") ||
                          pathname.startsWith("/pricing") ||
                          pathname.startsWith("/analytics") ||
                          pathname.startsWith("/billing") ||
                          pathname.startsWith("/settings");

  const mobileCookie = req.headers.get("x-mobile-cookie");
  const requestHeaders = new Headers(req.headers);
  if (mobileCookie) {
    // Override the native Cookie header with our manual bypass header from React Native
    requestHeaders.set("cookie", mobileCookie);
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });

  if (isAuthPage) {
    if (isLoggedIn) {
      response = NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  } else if (isDashboardPage && !isLoggedIn) {
    response = NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Append CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  // Apply middleware to everything except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

