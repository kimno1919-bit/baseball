import { prisma } from "@/lib/db";

// v2.4 상태 정의
export const CONDUCT_STATUS = {
  NORMAL: "NORMAL",
  CAUTION: "CAUTION",
  SUSPEND_1A: "SUSPEND_1A",
  SUSPEND_1B: "SUSPEND_1B",
  EXPELLED: "EXPELLED",
} as const;

export type ConductStatusType = keyof typeof CONDUCT_STATUS;

/**
 * 상태 도출 로직 (캐시 업데이트 및 suspension 추가)
 */
export async function recalculateConductStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { conductRecords: true, suspensionLedgers: true },
  });

  if (!user) throw new Error("User not found");
  
  // 이미 퇴출 상태인 경우 관리자 복권 없이 자동 계산으로 돌아오지 않음
  if (user.conductStatus === CONDUCT_STATUS.EXPELLED) {
    // 단, 합계는 업데이트해줌
    const currentTotal = user.conductRecords.reduce((acc, r) => acc + r.points, 0);
    if (currentTotal !== user.conductTotal) {
      await prisma.user.update({
        where: { id: userId },
        data: { conductTotal: currentTotal },
      });
    }
    return;
  }

  const newTotal = user.conductRecords.reduce((acc, r) => acc + r.points, 0);
  let newStatus = user.conductStatus;
  let expelledAt = user.expelledAt;
  
  // 상태 판별
  if (newTotal <= -40) {
    newStatus = CONDUCT_STATUS.EXPELLED;
    expelledAt = new Date();
  } else if (newTotal <= -25) {
    newStatus = CONDUCT_STATUS.SUSPEND_1B;
  } else if (newTotal <= -15) {
    newStatus = CONDUCT_STATUS.SUSPEND_1A;
  } else if (newTotal <= -1) {
    newStatus = CONDUCT_STATUS.CAUTION;
  } else {
    newStatus = CONDUCT_STATUS.NORMAL;
  }
  
  // 상향(강등) 감지 시 SuspensionLedger 발급 로직
  // 이미 발급된 이력(과거에 발급되었는지)을 확인하여 중복 발급 방지
  // -15점 도달 여부 확인 (SUSPEND_1A 기준)
  if (newTotal <= -15) {
    const has1A = user.suspensionLedgers.some(
      (s) => s.triggeredByConductId === "TRIGGER_1A" // 마커로 처리하거나 점수 합계 시점의 conductRecord와 연결
    );
    // 실제로는 어떤 conduct 기록에 의해 트리거되었는지 정확히 맵핑해야 함
    // 여기서는 단순화를 위해 사용자별로 -15 구간, -25 구간 도달 횟수나 상태 진입을 통해 발급
    // DB의 ledger 개수를 기반으로 판별 (매번 -15, -25를 지날 때마다 새롭게 추가하려면 누적 점수 하락 이력을 추적해야 함)
  }

  // 간단한 접근: 현재 점수(newTotal)가 -15 이하이고, 기존 conductTotal > -15 였다면 새로 진입한 것임
  let addedSuspension = 0;
  let triggeredId = user.conductRecords[user.conductRecords.length - 1]?.id;

  if (user.conductTotal > -15 && newTotal <= -15) {
    addedSuspension += 1;
  }
  if (user.conductTotal > -25 && newTotal <= -25) {
    addedSuspension += 1;
  }

  // 업데이트 수행
  await prisma.$transaction(async (tx) => {
    // 1. 유저 업데이트
    await tx.user.update({
      where: { id: userId },
      data: {
        conductTotal: newTotal,
        conductStatus: newStatus,
        suspensionRemaining: { increment: addedSuspension },
        expelledAt,
      },
    });

    // 2. 출전 정지 Ledger 추가
    for (let i = 0; i < addedSuspension; i++) {
      if (triggeredId) {
        await tx.suspensionLedger.create({
          data: {
            userId,
            triggeredByConductId: triggeredId,
            status: "PENDING",
          },
        });
      }
    }
  });
}

/**
 * 상벌점 부여 API
 */
export async function addConductRecord(
  userId: string,
  points: number,
  reason: string,
  seasonId?: string
) {
  const record = await prisma.conductRecord.create({
    data: {
      userId,
      points,
      reason,
      seasonId,
    },
  });

  await recalculateConductStatus(userId);
  return record;
}

/**
 * 퇴출자 복권 처리
 */
export async function reinstateUser(userId: string, adminId: string, reason: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.conductStatus !== CONDUCT_STATUS.EXPELLED) {
    throw new Error("User is not expelled");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reinstatementLog.create({
      data: {
        userId,
        expelledAt: user.expelledAt || new Date(),
        reinstatedBy: adminId,
        reason,
      },
    });

    // 복권 시 상태 재계산 강제 적용 (현재 누적 점수 기반으로 NORMAL ~ SUSPEND_1B 중 결정)
    // -40 이하인 상태 그대로면 다시 바로 퇴출될 수 있으므로, 보통 복권과 함께 상점을 부여하거나
    // 상태만 강제로 SUSPEND_1B 로 올려주는 등의 정책이 필요하지만, 여기서는 일단 점수에 맞게 재계산
    // 만약 점수가 여전히 -40 이하라면 로직상 다시 EXPELLED 가 되므로, 복권 시 0점으로 리셋하거나 특정 점수를 더해줘야 함.
    // PRD상에는 "관리자 수동 복권" 기능만 명시되어 있으므로, 0점 리셋이 일반적.
    
    // 임시로 합계를 0으로 만들고 NORMAL로 복권
    await tx.user.update({
      where: { id: userId },
      data: {
        conductTotal: 0,
        conductStatus: CONDUCT_STATUS.NORMAL,
        suspensionRemaining: 0,
        reinstatedAt: new Date(),
      },
    });

    // 모든 기존 상벌점 기록을 지우거나, 복권용 상점 기록을 추가
    const diff = 0 - user.conductTotal;
    if (diff > 0) {
      await tx.conductRecord.create({
        data: {
          userId,
          points: diff,
          reason: "퇴출자 복권",
        },
      });
    }
  });
}
