import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";

import { withPlatformLookup } from "@/lib/db-context";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = ((token.role as Role) ?? "STAFF") as Role;
        session.user.gymId = (token.gymId as string | null) ?? null;

        try {
          const dbUser = await withPlatformLookup((tx) =>
            tx.user.findUnique({
              where: { id: session.user.id },
              select: { name: true, email: true },
            }),
          );
          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
          }
        } catch {
          // DB unavailable — keep JWT name/email so pages still render.
          session.user.name = (token.name as string | null) ?? session.user.name;
          session.user.email = (token.email as string | null) ?? session.user.email;
        }
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await withPlatformLookup((tx) =>
          tx.user.findUnique({ where: { email } }),
        );
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          gymId: user.gymId,
        };
      },
    }),
  ],
});
