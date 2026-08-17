import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { verifyPassword, hashPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as any,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "placeholder",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "placeholder",
    }),
    Credentials({
      name: "Demo Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase();
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { email },
        });

        /**
         * SEC-003. This branch previously *created* an account for any unknown
         * email, deriving the role from substrings ("admin" in the address
         * granted ADMIN) or from a client-supplied `role` credential — so
         * anyone could self-provision an administrator from the login form.
         *
         * Unknown credentials now simply fail. Account creation happens only
         * through registerUser, which validates the role against an allowlist
         * that excludes ADMIN (SEC-010).
         */
        if (!user) return null;

        /**
         * SEC-002. Verify against a bcrypt hash, or against a legacy plaintext
         * value during the migration window. A user with no credential set
         * (e.g. an OAuth-only account) cannot sign in with a password.
         */
        if (!user.passwordHash) return null;

        const { valid, needsRehash } = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // The password has just been proven correct, so this is the one moment
        // the plaintext is legitimately available to upgrade in place.
        if (needsRehash) {
          try {
            await db.user.update({
              where: { id: user.id },
              data: {
                passwordHash: await hashPassword(password),
                passwordChangeRequired: true,
              },
            });
          } catch (err) {
            // A failed upgrade must not block a valid login; the next
            // successful sign-in retries it.
            console.error("Failed to upgrade legacy password hash:", err);
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image && user.image.startsWith("data:") ? null : user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || Role.FREELANCER;
        token.name = user.name;
        token.picture = user.image && user.image.startsWith("data:") ? null : user.image;
      } else {
        const userId = (token.id || token.sub) as string;
        if (userId) {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: userId },
              select: { role: true, name: true, image: true },
            });
            if (dbUser) {
              token.role = dbUser.role;
              token.name = dbUser.name;
              token.picture = dbUser.image && dbUser.image.startsWith("data:") ? null : dbUser.image;
            }
          } catch (dbErr) {
            console.warn("Temporary database lookup failure in Auth JWT callback (using cached token values):", dbErr);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = (token.id || token.sub) as string;
        session.user.role = token.role as Role;
        if (token.name) session.user.name = token.name as string;
        if (token.picture) {
          session.user.image = (token.picture as string).startsWith("data:") ? null : (token.picture as string);
        } else {
          session.user.image = null;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
});
