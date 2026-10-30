import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        isVerification: { label: "isVerification", type: "text" }
      },
      async authorize(credentials) {
        const rawEmail = (credentials?.email as string) ?? "";
        const password = (credentials?.password as string) ?? "";
        const email = rawEmail.trim().toLowerCase();

        if (!email || !password) return null;

        const user = await db.user.findFirst({
          where: {
            email: {
              equals: email,
              mode: "insensitive"
            }
          }
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      }
    })
  ],
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await db.creditWallet.create({
          data: {
            userId: user.id,
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
        });
      }
    }
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (session.user) {
        if (token.name) session.user.name = token.name;
        if (token.picture !== undefined) session.user.image = token.picture as string | null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session, account }) {
      let userImage = user?.image || token.picture || "";
      // If the image is a massive base64 string from the database, do not put it in the JWT cookie!
      // Cookies have a strict 4KB limit.
      if (typeof userImage === 'string' && userImage.length > 2000) {
        userImage = "";
      }

      const strippedToken = {
        sub: String(user?.id || token.sub || ""),
        name: String(user?.name || token.name || ""),
        email: String(user?.email || token.email || ""),
        picture: String(userImage),
      };

      if (trigger === "update" && session) {
        if (session.name !== undefined) {
          strippedToken.name = String(session.name);
        }
        if (session.image !== undefined) {
          let updatedImage = session.image;
          if (typeof updatedImage === 'string' && updatedImage.length > 2000) {
            updatedImage = "";
          }
          strippedToken.picture = String(updatedImage);
        }
      }
      
      return strippedToken;
    }
  }
});
