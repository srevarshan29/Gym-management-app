import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      gymId: string | null;
      kind?: "member";
      memberId?: string;
      memberNumber?: number;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    gymId?: string | null;
    memberId?: string;
    memberNumber?: number;
    kind?: "member";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: Role;
    gymId?: string | null;
    kind?: "member";
    memberId?: string;
    memberNumber?: number;
    name?: string | null;
    email?: string | null;
  }
}
