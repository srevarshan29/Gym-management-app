import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { measureServerPhase } from "@/lib/server-perf";
import { authConfig } from "@/auth.config";
import { getRepositories, platformContext } from "@/lib/firestore";
import {
  checkStaffLoginThrottle,
  clearStaffLoginFailures,
  getStaffLoginClientIp,
  recordStaffLoginFailure,
} from "@/lib/staff-login-throttle";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return measureServerPhase("staff.auth.credentials", async () => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const ip = await getStaffLoginClientIp();
        const throttle = await checkStaffLoginThrottle(email, ip);
        if (!throttle.ok) {
          return null;
        }

        const { users } = getRepositories();
        const user = await users.findByEmail(platformContext, email);
        if (!user) {
          await recordStaffLoginFailure(email, ip);
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          await recordStaffLoginFailure(email, ip);
          return null;
        }

        await clearStaffLoginFailures(email, ip);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          gymId: user.gymId,
        };
        });
      },
    }),
  ],
});
