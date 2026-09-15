import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required in production behind a reverse proxy (Caddy): without it Auth.js
  // refuses the forwarded Host header and every auth route 500s with the
  // generic "server configuration" page. Same fix the playlist app needed on
  // Vercel (its commit 33828ce).
  trustHost: true,
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const dj = await prisma.dJAllowlist.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!dj || !dj.passwordHash) return null;

        const valid = await bcrypt.compare(password, dj.passwordHash);
        if (!valid) return null;

        // Update login timestamps
        await prisma.dJAllowlist.update({
          where: { email: dj.email },
          data: {
            lastLoginAt: new Date(),
            firstLoginAt: dj.firstLoginAt ?? new Date(),
          },
        });

        return {
          id: dj.email,
          email: dj.email,
          name: dj.displayName ?? dj.email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dj = await prisma.dJAllowlist.findUnique({
          where: { email: session.user.email },
        });
        // If DJ was removed from allowlist, invalidate the session
        if (!dj) {
          return null as unknown as typeof session;
        }
        (session.user as { isAdmin?: boolean }).isAdmin = dj.isAdmin;
        if (dj.displayName) {
          session.user.name = dj.displayName;
        }
      }
      return session;
    },
  },
});
