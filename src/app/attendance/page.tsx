"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertCircle } from "lucide-react";

export default function AttendancePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  const [conductUsers, setConductUsers] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 내 상벌점 정보 로드 (마이페이지 프로필 API 활용)
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setMyProfile(data.user);
      }

      // 관리자인 경우 부원 목록 전체 로드
      if (isAdmin) {
        const mRes = await fetch("/api/admin/members");
        if (mRes.ok) {
          setConductUsers(await mRes.json());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const handleAssignConduct = async (userId: string) => {
    const pointsStr = window.prompt("부여할 점수를 입력하세요 (상점은 양수, 벌점은 음수)");
    if (!pointsStr) return;
    const points = Number(pointsStr);
    if (isNaN(points)) {
      alert("숫자만 입력 가능합니다.");
      return;
    }
    const reason = window.prompt("사유를 입력하세요");
    if (!reason) return;

    try {
      const res = await fetch("/api/conduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, points, reason }),
      });
      if (res.ok) {
        alert("상벌점이 부여되었습니다.");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "상벌점 부여 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReinstate = async (userId: string) => {
    const reason = window.prompt("복권 사유를 입력하세요 (예: 반성문 제출 등)");
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/members/${userId}/reinstate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        alert("부원이 정상적으로 복권되었습니다.");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "복권 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRemarks = async (userId: string, currentRemarks: string) => {
    const remarks = window.prompt("비고란을 입력하세요 (예: 1경기 출장 정지 등)", currentRemarks || "");
    if (remarks === null) return;

    try {
      const res = await fetch(`/api/admin/members/${userId}/remarks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert("비고 업데이트 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">출결 및 상벌점 현황</h1>
        <p className="text-xs text-muted-foreground">부원들의 누적 출결 및 상벌점, 징계 현황을 관리합니다.</p>
      </div>

      {myProfile && (
        <div className="p-6 bg-muted/30 dark:bg-muted-foreground/5 rounded-3xl border border-customBorder-light dark:border-customBorder-dark space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-warning-light" />
            나의 상벌점 현황
          </h3>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">누적 점수</span>
              <span className="text-2xl font-black">{myProfile.conductTotal || 0}점</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">현재 징계 상태</span>
              <span className="text-lg font-bold text-primary-light dark:text-primary-dark">
                {myProfile.conductStatus === "NORMAL" ? "정상" :
                 myProfile.conductStatus === "CAUTION" ? "주의" :
                 myProfile.conductStatus === "SUSPEND_1A" ? "출전 정지 (1단계)" :
                 myProfile.conductStatus === "SUSPEND_1B" ? "출전 정지 (2단계)" :
                 myProfile.conductStatus === "EXPELLED" ? "영구 퇴출" : "알 수 없음"}
              </span>
            </div>
            {myProfile.suspensionRemaining > 0 && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">출전 정지 잔여</span>
                <span className="text-lg font-bold text-danger-light">{myProfile.suspensionRemaining} 경기</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2">팀 전체 상벌점 현황판</h2>
          <div className="overflow-x-auto border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
            <table className="w-full text-center text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                  <th className="p-3 text-left">부원명 (학번)</th>
                  <th className="p-3">출석</th>
                  <th className="p-3">지각</th>
                  <th className="p-3">무단 불참</th>
                  <th className="p-3 text-success-light">상점</th>
                  <th className="p-3 text-danger-light">벌점</th>
                  <th className="p-3">합계</th>
                  <th className="p-3">징계 상태</th>
                  <th className="p-3">비고</th>
                  <th className="p-3">액션</th>
                </tr>
              </thead>
              <tbody>
                {conductUsers.map((m) => (
                  <tr key={m.id} className="border-b border-customBorder-light dark:border-customBorder-dark last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-left font-bold">
                      {m.name} ({m.loginId})
                    </td>
                    <td className="p-3">{m.presentCount || 0}</td>
                    <td className="p-3 text-warning-light">{m.lateCount || 0}</td>
                    <td className="p-3 text-danger-light">{m.unexcusedCount || 0}</td>
                    <td className="p-3 text-success-light font-bold">+{m.meritPoints || 0}</td>
                    <td className="p-3 text-danger-light font-bold">{m.demeritPoints || 0}</td>
                    <td className="p-3 font-semibold">
                      <span className={m.conductTotal < 0 ? 'text-danger-light' : m.conductTotal > 0 ? 'text-success-light' : ''}>
                        {m.conductTotal ?? 0}점
                      </span>
                    </td>
                    <td className="p-3 font-bold text-[10px]">
                      {m.conductStatus === "NORMAL" && <span className="text-success-light">정상</span>}
                      {m.conductStatus === "CAUTION" && <span className="text-warning-light">주의</span>}
                      {m.conductStatus === "SUSPEND_1A" && <span className="text-danger-light">정지(1단계)</span>}
                      {m.conductStatus === "SUSPEND_1B" && <span className="text-danger-light">정지(2단계)</span>}
                      {m.conductStatus === "EXPELLED" && <span className="text-gray-500 line-through">퇴출</span>}
                      {m.suspensionRemaining > 0 && <span className="block text-danger-light mt-1">({m.suspensionRemaining}경기)</span>}
                    </td>
                    <td className="p-3 max-w-[150px] truncate text-left cursor-pointer hover:bg-muted/30 rounded" onClick={() => handleUpdateRemarks(m.id, m.remarks)}>
                      {m.remarks ? <span className="text-xs">{m.remarks}</span> : <span className="text-xs text-muted-foreground italic">클릭하여 입력</span>}
                    </td>
                    <td className="p-2 space-y-1 flex flex-col items-center justify-center">
                      <button
                        onClick={() => handleAssignConduct(m.id)}
                        className="w-full px-2 py-1 bg-primary-light/10 text-primary-light hover:bg-primary-light/20 rounded font-bold text-[10px]"
                      >
                        점수 부여
                      </button>
                      {m.conductStatus === "EXPELLED" && (
                        <button
                          onClick={() => handleReinstate(m.id)}
                          className="w-full px-2 py-1 bg-success-light/10 text-success-light hover:bg-success-light/20 rounded font-bold text-[10px]"
                        >
                          수동 복권
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
