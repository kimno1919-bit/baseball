import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, encryptPhone } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      loginId,
      password,
      phone,
      jerseyNumber,
      primaryPosition,
      battingHand,
      throwingHand,
      inviteCode,
    } = body;

    // 필수값 유효성 검사
    if (!name || !loginId || !password || !phone || !inviteCode) {
      return NextResponse.json(
        { error: "필수 입력 항목이 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. 초대 코드로 클럽 조회
    const club = await prisma.club.findUnique({
      where: { inviteCode },
    });

    if (!club) {
      return NextResponse.json(
        { error: "유효하지 않은 초대 코드입니다." },
        { status: 400 }
      );
    }

    // 2. 이미 존재하는 학번(loginId)인지 확인
    const existingUser = await prisma.user.findUnique({
      where: { loginId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 가입 신청 또는 가입이 완료된 학번입니다." },
        { status: 400 }
      );
    }

    // 3. 비밀번호 해싱 및 전화번호 암호화
    const passwordHash = await hashPassword(password);
    const encryptedPhone = encryptPhone(phone);

    // 4. 트랜잭션으로 유저 가입 신청 및 인비테이션 생성
    const result = await prisma.$transaction(async (tx) => {
      // 대기중인 가입자로 생성
      const user = await tx.user.create({
        data: {
          clubId: club.id,
          loginId,
          passwordHash,
          name,
          phone: encryptedPhone,
          role: "MEMBER", // 기본 역할은 MEMBER
          status: "PENDING", // 승인 대기 상태
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
          primaryPosition,
          battingHand,
          throwingHand,
        },
      });

      // 가입 신청 기록 생성
      const invitation = await tx.invitation.create({
        data: {
          clubId: club.id,
          applicantName: name,
          applicantLoginId: loginId,
          status: "PENDING",
        },
      });

      // 교사(ADMIN)들에게 알림 생성
      const admins = await tx.user.findMany({
        where: {
          clubId: club.id,
          role: "ADMIN",
        },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: "JOIN_REQUEST",
            title: "신규 가입 신청",
            body: `${name}(학번: ${loginId}) 부원의 가입 신청이 접수되었습니다.`,
            linkUrl: "/admin/members",
            isRead: false,
          },
        });
      }

      return { user, invitation };
    });

    return NextResponse.json({
      message: "가입 신청이 성공적으로 접수되었습니다. 교사의 승인 후 로그인이 가능합니다.",
      userId: result.user.id,
    });
  } catch (error: any) {
    console.error("회원가입 에러:", error);
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
