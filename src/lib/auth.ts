import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { comparePassword } from "@/lib/crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        loginId: { label: "학번", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.loginId || !credentials?.password) {
          throw new Error("학번과 비밀번호를 입력해주세요.");
        }

        const user = await prisma.user.findUnique({
          where: { loginId: credentials.loginId },
        });

        if (!user) {
          throw new Error("가입되지 않은 학번이거나 비밀번호가 틀렸습니다.");
        }

        if (user.status === "PENDING") {
          throw new Error("가입 승인 대기 중입니다. 관리자 교사의 승인을 기다려주세요.");
        }

        if (user.status === "INACTIVE") {
          throw new Error("비활성화된 계정입니다. 관리자 교사에게 문의하세요.");
        }

        const isPasswordValid = await comparePassword(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("가입되지 않은 학번이거나 비밀번호가 틀렸습니다.");
        }

        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
          clubId: user.clubId,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.loginId = user.loginId;
        token.role = user.role;
        token.clubId = user.clubId;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.loginId = token.loginId as string;
        session.user.role = token.role as string;
        session.user.clubId = token.clubId as string;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14일
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "nextauth-baseball-fallback-secret-2026",
};
