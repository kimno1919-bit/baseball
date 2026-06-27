import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin, errorResponse } from "@/lib/api-middleware";

/**
 * 가입 대기중인 신청 목록 조회 (교사 전용)
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) {
      return errorResponse("권한이 없습니다. 교사 계정으로 로그인해주세요.", 403);
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        clubId: user.clubId,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(invitations);
  } catch (error: any) {
    console.error("가입 신청 목록 조회 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}

/**
 * 가입 신청 승인 또는 거절 처리 (교사 전용)
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) {
      return errorResponse("권한이 없습니다. 교사 계정으로 로그인해주세요.", 403);
    }

    const body = await req.json();
    const { invitationId, action } = body; // action: "APPROVE" | "REJECT"

    if (!invitationId || !action) {
      return errorResponse("필수 정보가 누락되었습니다.");
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.clubId !== user.clubId) {
      return errorResponse("해당 가입 신청을 찾을 수 없습니다.", 404);
    }

    if (invitation.status !== "PENDING") {
      return errorResponse("이미 처리가 완료된 가입 신청입니다.");
    }

    // 신청자의 User 레코드 조회
    const applicant = await prisma.user.findUnique({
      where: { loginId: invitation.applicantLoginId },
    });

    if (!applicant) {
      return errorResponse("신청자 회원 정보를 찾을 수 없습니다.", 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === "APPROVE") {
        // 1. 가입 신청 승인 업데이트
        await tx.invitation.update({
          where: { id: invitationId },
          data: {
            status: "APPROVED",
            reviewedBy: user.id,
          },
        });

        // 2. 유저 상태 ACTIVE 변경
        await tx.user.update({
          where: { id: applicant.id },
          data: {
            status: "ACTIVE",
          },
        });

        // 3. 인앱 알림 전송 (승인 완료)
        await tx.notification.create({
          data: {
            userId: applicant.id,
            type: "JOIN_APPROVED",
            title: "가입 승인 완료",
            body: "축하합니다! 클럽 가입 신청이 교사(관리자)에 의해 승인되었습니다. 이제 서비스를 정상 이용하실 수 있습니다.",
            linkUrl: "/dashboard",
            isRead: false,
          },
        });

        return { message: "가입 신청을 승인하였습니다." };
      } else {
        // action === "REJECT"
        // 1. 가입 신청 거절 업데이트
        await tx.invitation.update({
          where: { id: invitationId },
          data: {
            status: "REJECTED",
            reviewedBy: user.id,
          },
        });

        // 2. 유저 상태 INACTIVE 변경
        await tx.user.update({
          where: { id: applicant.id },
          data: {
            status: "INACTIVE",
          },
        });

        // 3. 인앱 알림 전송 (거절)
        await tx.notification.create({
          data: {
            userId: applicant.id,
            type: "JOIN_REJECTED",
            title: "가입 승인 거절",
            body: "안타깝게도 클럽 가입 신청이 거절되었습니다. 사유는 교사에게 문의하세요.",
            linkUrl: null,
            isRead: false,
          },
        });

        return { message: "가입 신청을 거절하였습니다." };
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("가입 신청 처리 에러:", error);
    return errorResponse("처리 중 오류가 발생했습니다.", 500);
  }
}
