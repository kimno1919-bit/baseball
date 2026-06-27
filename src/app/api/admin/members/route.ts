import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin, errorResponse } from "@/lib/api-middleware";
import { decryptPhone, maskPhone } from "@/lib/crypto";

/**
 * 클럽의 전체 멤버 목록 조회 (교사 전용)
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) {
      return errorResponse("권한이 없습니다. 교사 계정으로 로그인해주세요.", 403);
    }

    const members = await prisma.user.findMany({
      where: {
        clubId: user.clubId,
      },
      orderBy: [
        { role: "asc" }, // ADMIN -> MANAGER -> MEMBER 순서 정렬 유도
        { name: "asc" },
      ],
    });

    // 전화번호 복호화 및 마스킹 처리
    const processedMembers = members.map((m) => {
      const decrypted = decryptPhone(m.phone);
      const masked = maskPhone(decrypted);
      return {
        id: m.id,
        loginId: m.loginId,
        name: m.name,
        phone: masked, // 마스킹된 번호만 안전하게 반환
        role: m.role,
        status: m.status,
        jerseyNumber: m.jerseyNumber,
        primaryPosition: m.primaryPosition,
        battingHand: m.battingHand,
        throwingHand: m.throwingHand,
        joinedAt: m.joinedAt,
      };
    });

    return NextResponse.json(processedMembers);
  } catch (error: any) {
    console.error("멤버 목록 조회 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}

/**
 * 멤버 권한 변경 및 활성화/비활성화 처리 (교사 전용)
 */
export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) {
      return errorResponse("권한이 없습니다. 교사 계정으로 로그인해주세요.", 403);
    }

    const body = await req.json();
    const { targetUserId, role, status } = body;

    if (!targetUserId) {
      return errorResponse("대상 사용자 ID가 누락되었습니다.");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.clubId !== user.clubId) {
      return errorResponse("해당 멤버를 찾을 수 없습니다.", 404);
    }

    // 자기 자신에 대한 권한 변경 불가 방지 (교사 본인을 탈퇴시키거나 역할을 변경하는 것 제한)
    if (targetUser.id === user.id && role && role !== "ADMIN") {
      return errorResponse("자신의 최고 관리자 권한은 변경할 수 없습니다.");
    }

    const updatedData: any = {};
    if (role) updatedData.role = role;
    if (status) updatedData.status = status;

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: updatedData,
      });

      // 권한이 변경되었을 때 당사자에게 인앱 알림 전송
      if (role && role !== targetUser.role) {
        await tx.notification.create({
          data: {
            userId: targetUserId,
            type: "ROLE_CHANGED",
            title: "권한 변경 알림",
            body: `회원님의 역할이 ${targetUser.role}에서 ${role}(으)로 변경되었습니다.`,
            linkUrl: "/dashboard",
            isRead: false,
          },
        });
      }

      return updatedUser;
    });

    return NextResponse.json({
      message: "멤버 정보가 정상적으로 수정되었습니다.",
      user: {
        id: result.id,
        name: result.name,
        role: result.role,
        status: result.status,
      },
    });
  } catch (error: any) {
    console.error("멤버 정보 수정 에러:", error);
    return errorResponse("멤버 정보 수정 중 오류가 발생했습니다.", 500);
  }
}
