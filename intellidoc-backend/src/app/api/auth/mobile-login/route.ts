/**
 * POST /api/auth/mobile-login
 *
 * A CSRF-free login endpoint specifically for the React Native mobile client.
 * NextAuth's built-in CSRF validation cannot be satisfied from React Native because
 * the native networking stack (NSURLSession / OkHttp) strips Cookie headers on
 * cross-origin requests, making it impossible to echo back the csrf-token cookie.
 *
 * This endpoint:
 *   1. Validates the user's credentials directly against the database (same logic as auth.ts).
 *   2. Creates a signed NextAuth JWT session token using the same secret.
 *   3. Returns the token in both the response body AND a Set-Cookie header so
 *      either approach works depending on the platform.
 *
 * Security: The endpoint is only called over HTTPS in production. The JWT is signed
 * with AUTH_SECRET, so it cannot be forged.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { encode } from "@auth/core/jwt";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses social login. Please sign in with Google." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before logging in." },
        { status: 403 }
      );
    }

    // Build the same JWT payload that NextAuth would create
    const secret = process.env.AUTH_SECRET!;
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    // Determine cookie name first — it must be used as the salt
    const isSecure =
      process.env.NODE_ENV === "production" ||
      process.env.AUTH_URL?.startsWith("https://");
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    const token = await encode({
      token: {
        sub: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        picture: user.image ?? "",
      },
      secret,
      salt: cookieName, // @auth/core v5 requires salt = cookieName for decode to work
      maxAge: SESSION_MAX_AGE,
    });

    const cookieOptions = [
      `${cookieName}=${token}`,
      "Path=/",
      "HttpOnly",
      `Max-Age=${SESSION_MAX_AGE}`,
      `SameSite=Lax`,
      `Expires=${expiresAt.toUTCString()}`,
      ...(isSecure ? ["Secure"] : []),
    ].join("; ");

    const responseBody = {
      token,
      cookieName,
      expires: expiresAt.toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    };

    return new NextResponse(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieOptions,
      },
    });
  } catch (error) {
    console.error("[mobile-login] error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
