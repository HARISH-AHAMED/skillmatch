import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    /** SEC-002 — set on a credential upgraded from legacy plaintext storage. */
    passwordChangeRequired?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      passwordChangeRequired?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    passwordChangeRequired?: boolean;
  }
}
