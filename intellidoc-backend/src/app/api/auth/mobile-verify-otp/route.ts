/**
 * POST /api/auth/mobile-verify-otp
 *
 * Verifies an OTP for registration completion and returns a signed session token.
 * This is the mobile-safe equivalent of the NextAuth credentials callback with
 * isVerification=true, bypassing CSRF.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRedisClient } from "@/lib/redis/client";
import { encode } from "@auth/core/jwt";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body as { email?: string; otp?: string };

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const redis = await getRedisClient();
    const storedOtp = await redis.get(`auth:otp:${email}`);

    if (storedOtp !== otp) {
      return NextResponse.json(
        { error: "Invalid or expired OTP." },
        { status: 401 }
      );
    }

    // Mark email as verified
    await db.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    await redis.del(`auth:otp:${email}`);

    const isSecure =
      process.env.NODE_ENV === "production" ||
      process.env.AUTH_URL?.startsWith("https://");
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    const secret = process.env.AUTH_SECRET!;
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

    const token = await encode({
      token: {
        sub: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        picture: user.image ?? "",
      },
      secret,
      salt: cookieName,
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

    return new NextResponse(
      JSON.stringify({
        token,
        cookieName,
        expires: expiresAt.toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": cookieOptions,
        },
      }
    );
  } catch (error) {
    console.error("[mobile-verify-otp] error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
