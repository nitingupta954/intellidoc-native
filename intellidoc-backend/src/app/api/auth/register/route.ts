import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    const cleanName = (name ?? "").trim();
    const cleanEmail = (email ?? "").trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await db.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive"
        }
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        emailVerified: new Date(),
        creditWallet: {
          create: {
            balance: 200,
            lifetimeGranted: 200,
            transactions: {
              create: {
                type: 'SIGNUP_GRANT',
                amount: 200,
                balanceAfter: 200
              }
            }
          }
        }
      },
    });

    return NextResponse.json({ success: true, email: user.email }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
