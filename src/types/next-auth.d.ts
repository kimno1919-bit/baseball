import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      loginId: string;
      role: string;
      clubId: string;
      status: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    loginId: string;
    role: string;
    clubId: string;
    status: string;
  }
}
