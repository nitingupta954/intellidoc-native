import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getRedisClient } from "@/lib/redis/client";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: "Email, OTP, and password are required" },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
            "Access-Control-Allow-Credentials": "true",
          }
        }
      );
    }

    const redis = await getRedisClient();
    const storedOtp = await redis.get(`auth:reset:${email}`);

    if (!storedOtp) {
      return NextResponse.json(
        { error: "OTP expired or not found. Please request a new one." },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
            "Access-Control-Allow-Credentials": "true",
          }
        }
      );
    }

    if (storedOtp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Please try again." },
        { 
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
            "Access-Control-Allow-Credentials": "true",
          }
        }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the OTP so it can't be reused
    await redis.del(`auth:reset:${email}`);

    return NextResponse.json(
      { message: "Password updated successfully" },
      { 
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
          "Access-Control-Allow-Credentials": "true",
        }
      }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
          "Access-Control-Allow-Credentials": "true",
        }
      }
    );
  }
}
