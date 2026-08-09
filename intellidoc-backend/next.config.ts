import type { NextConfig } from "next";

// Ignore Next.js client abort ECONNRESET globally
process.on('uncaughtException', (err: any) => {
  if (err && err.code === 'ECONNRESET' && err.message === 'aborted') {
    return;
  }
  console.error('Unhandled Exception:', err);
});

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
