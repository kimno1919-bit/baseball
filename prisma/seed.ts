import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// AES-256-CBC 암호화 헬퍼 (로컬 시드용 복제)
const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = crypto.scryptSync("baseball-club-secret-key-2026", "salt", 32);
const IV_LENGTH = 16;

function encryptPhone(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

async function main() {
  console.log("시드 데이터 생성 시작...");

  // 1. 클럽 생성
  const club = await prisma.club.upsert({
    where: { inviteCode: "BASE26" },
    update: {},
    create: {
      schoolName: "한가람고등학교",
      clubName: "한가람 타이탄즈",
      inviteCode: "BASE26",
    },
  });

  console.log("클럽 생성 완료:", club.clubName, `(초대코드: ${club.inviteCode})`);

  // 비밀번호 해싱
  const teacherHash = await bcrypt.hash("admin1234", 12);
  const studentHash = await bcrypt.hash("student1234", 12);

  // 2. 교사(ADMIN) 생성
  const admin = await prisma.user.upsert({
    where: { loginId: "ADMIN" },
    update: {},
    create: {
      clubId: club.id,
      loginId: "ADMIN",
      passwordHash: teacherHash,
      name: "김교사",
      phone: encryptPhone("010-1111-2222"),
      role: "ADMIN",
      status: "ACTIVE",
      jerseyNumber: 99,
      primaryPosition: "DH",
    },
  });

  console.log("교사(ADMIN) 생성 완료:", admin.name);

  // 3. 매니저(MANAGER) 생성
  const manager = await prisma.user.upsert({
    where: { loginId: "20261111" },
    update: {},
    create: {
      clubId: club.id,
      loginId: "20261111",
      passwordHash: studentHash,
      name: "이매니저",
      phone: encryptPhone("010-2222-3333"),
      role: "MANAGER",
      status: "ACTIVE",
      jerseyNumber: 10,
      primaryPosition: "C",
    },
  });

  console.log("매니저(MANAGER) 생성 완료:", manager.name);

  // 4. 일반 부원들(MEMBER) 생성
  const membersData = [
    { loginId: "20260001", name: "홍길동", jerseyNumber: 7, position: "SS" },
    { loginId: "20260002", name: "강타자", jerseyNumber: 23, position: "1B" },
    { loginId: "20260003", name: "김투수", jerseyNumber: 1, position: "P" },
    { loginId: "20260004", name: "이수비", jerseyNumber: 17, position: "2B" },
    { loginId: "20260005", name: "박포수", jerseyNumber: 22, position: "C" },
    { loginId: "20260006", name: "최외야", jerseyNumber: 51, position: "CF" },
    { loginId: "20260007", name: "정좌익", jerseyNumber: 9, position: "LF" },
    { loginId: "20260008", name: "한우익", jerseyNumber: 34, position: "RF" },
    { loginId: "20260009", name: "윤핫코너", jerseyNumber: 5, position: "3B" },
  ];

  for (const m of membersData) {
    await prisma.user.upsert({
      where: { loginId: m.loginId },
      update: {},
      create: {
        clubId: club.id,
        loginId: m.loginId,
        passwordHash: studentHash,
        name: m.name,
        phone: encryptPhone("010-9999-8888"),
        role: "MEMBER",
        status: "ACTIVE",
        jerseyNumber: m.jerseyNumber,
        primaryPosition: m.position,
        battingHand: "R",
        throwingHand: "R",
      },
    });
  }

  console.log("일반 부원 9명 생성 완료.");

  // 5. 가입 대기 부원 생성
  const pendingUser = await prisma.user.upsert({
    where: { loginId: "20269999" },
    update: {},
    create: {
      clubId: club.id,
      loginId: "20269999",
      passwordHash: studentHash,
      name: "장대기",
      phone: encryptPhone("010-7777-6666"),
      role: "MEMBER",
      status: "PENDING",
      jerseyNumber: 12,
      primaryPosition: "LF",
    },
  });

  await prisma.invitation.upsert({
    where: { id: "pending-invitation-id-1" },
    update: {},
    create: {
      id: "pending-invitation-id-1",
      clubId: club.id,
      applicantName: "장대기",
      applicantLoginId: "20269999",
      status: "PENDING",
    },
  });

  console.log("가입 신청 대기자 생성 완료:", pendingUser.name);

  // 6. 활성 시즌 생성
  const season = await prisma.season.create({
    data: {
      clubId: club.id,
      name: "2026 상반기 리그",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-08-31"),
      inningsPerGame: 7,
      mercyRuleDiff: 10,
      isActive: true,
    },
  });

  console.log("활성 시즌 생성 완료:", season.name);

  console.log("시드 데이터 생성 성공!");
}

main()
  .catch((e) => {
    console.error("시딩 에러:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
