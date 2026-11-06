import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
  serverExternalPackages: [
    "@prisma/client",
    "bcryptjs",
    "amqplib",
    "bullmq",
    "ioredis",
    "nodemailer",
    "razorpay",
    "pdf-parse",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
