import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export interface AuthenticatedUser {
  id: string;
  name: string;
  loginId: string;
  role: string;
  clubId: string;
  status: string;
}

/**
 * API 요청에서 사용자의 세션을 확인하고 인증된 유저 정보를 반환합니다.
 * 인증되지 않은 경우 NextResponse(401)를 반환합니다.
 */
export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  return session.user as AuthenticatedUser;
}

/**
 * 교사(ADMIN) 권한을 확인하는 헬퍼
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "ADMIN";
}

/**
 * 교사(ADMIN) 또는 매니저(MANAGER) 권한을 확인하는 헬퍼
 */
export function isStaff(user: AuthenticatedUser): boolean {
  return user.role === "ADMIN" || user.role === "MANAGER";
}

/**
 * 공통 에러 응답 유틸리티
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}
