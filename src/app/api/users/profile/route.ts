import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, errorResponse } from "@/lib/api-middleware";
import { hashPassword, comparePassword, encryptPhone } from "@/lib/crypto";

/**
 * 로그인한 사용자의 프로필 수정 API (MEMBER, MANAGER, ADMIN 공통)
 * PATCH /api/users/profile
 */
export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("로그인이 필요합니다.", 401);
    }

    const body = await req.json();
    const { 
      jerseyNumber, 
      primaryPosition, 
      battingHand, 
      throwingHand, 
      phone, 
      currentPassword, 
      newPassword 
    } = body;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return errorResponse("사용자 정보를 찾을 수 없습니다.", 404);
    }

    const updateData: any = {};

    // 1. 프로필 세부 항목 업데이트
    if (jerseyNumber !== undefined) updateData.jerseyNumber = jerseyNumber ? parseInt(jerseyNumber) : null;
    if (primaryPosition !== undefined) updateData.primaryPosition = primaryPosition;
    if (battingHand !== undefined) updateData.battingHand = battingHand;
    if (throwingHand !== undefined) updateData.throwingHand = throwingHand;
    
    // 2. 전화번호 업데이트 시 암호화
    if (phone) {
      updateData.phone = encryptPhone(phone);
    }

    // 3. 비밀번호 변경 로직
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse("비밀번호 변경을 위해 현재 비밀번호를 입력해주세요.");
      }

      // 현재 비밀번호 검증
      const isMatch = await comparePassword(currentPassword, dbUser.passwordHash);
      if (!isMatch) {
        return errorResponse("현재 비밀번호가 틀렸습니다.");
      }

      // 신규 비밀번호 정규식 검증
      const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/;
      if (!pwdRegex.test(newPassword)) {
        return errorResponse("새 비밀번호는 최소 8자 이상, 영문과 숫자의 조합이어야 합니다.");
      }

      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      message: "프로필 정보가 성공적으로 변경되었습니다.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        jerseyNumber: updatedUser.jerseyNumber,
      },
    });
  } catch (error: any) {
    console.error("프로필 수정 에러:", error);
    return errorResponse("프로필 수정 중 오류가 발생했습니다.", 500);
  }
}
