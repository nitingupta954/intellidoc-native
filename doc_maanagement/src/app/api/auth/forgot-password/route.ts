import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailService } from "@/lib/email";
import { getRedisClient } from "@/lib/redis/client";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    // We don't want to reveal if a user exists or not for security reasons,
    // so we return success either way, but we only generate an OTP and send an email if they exist.
    if (user) {
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const redis = await getRedisClient();
      await redis.set(`auth:reset:${email}`, otp, "EX", 600); // 10 minutes

      // Send the email
      await emailService.sendPasswordResetOTP(email, otp);
    }

    return NextResponse.json(
      { message: "If an account exists with that email, we have sent a password reset code." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
