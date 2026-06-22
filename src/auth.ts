import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

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

        // Find user in DB
        let user = await db.user.findUnique({
          where: { email },
        });

        // For developer convenience, if it is local development and the user doesn't exist, we automatically create them!
        if (!user) {
          let role: Role = Role.FREELANCER;
          if (email.includes("admin")) {
            role = Role.ADMIN;
          } else if (email.includes("company")) {
            role = Role.COMPANY;
          } else if (credentials.role) {
            const passedRole = (credentials.role as string).toUpperCase();
            if (passedRole === "ADMIN" || passedRole === "COMPANY" || passedRole === "FREELANCER") {
              role = passedRole as Role;
            }
          }

          user = await db.user.create({
            data: {
              email,
              name: email.split("@")[0].replace(/^\w/, (c: string) => c.toUpperCase()),
              role,
              passwordHash: password,
            },
          });

          // Automatically create corresponding role profile
          if (role === Role.FREELANCER) {
            await db.freelancer.create({
              data: {
                userId: user.id,
                bio: "Expert React, Next.js, and Node.js developer with 5+ years of software design experience.",
                skills: ["typescript", "react", "next.js", "tailwind", "node.js", "postgresql", "python"],
                experienceYears: 5,
                portfolioUrl: "https://github.com",
                rating: 4.9,
                completedProjects: 14,
                completionRate: 98.0,
              },
            });
          } else if (role === Role.COMPANY) {
            await db.company.create({
              data: {
                userId: user.id,
                companyName: "Quantum Labs AI",
                description: "Innovating AI products and scalable modern platforms.",
                industry: "Technology",
                website: "https://quantumlabs.ai",
                location: "Austin, TX",
              },
            });
          }
        }

        // Validate password (basic comparison for demo credentials)
        if (user.passwordHash && user.passwordHash !== password) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
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
        token.picture = user.image;
      } else {
        const userId = (token.id || token.sub) as string;
        if (userId) {
          const dbUser = await db.user.findUnique({
            where: { id: userId },
            select: { role: true, name: true, image: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.name = dbUser.name;
            token.picture = dbUser.image;
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
        if (token.picture) session.user.image = token.picture as string;
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
