"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { 
  User, 
  Settings, 
  Users, 
  UserCheck, 
  FolderGit2, 
  AlertCircle, 
  CheckCircle2, 
  Moon, 
  Sun,
  Plus
} from "lucide-react";

export default function MyPage() {
  const { data: session, update: updateSession } = useSession();
  const { darkMode, toggleDarkMode } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<"profile" | "members" | "requests" | "seasons">("profile");
  
  // 상태 메시지
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. 프로필 폼 상태
  const [profileForm, setProfileForm] = useState({
    jerseyNumber: "",
    primaryPosition: "DH",
    battingHand: "R",
    throwingHand: "R",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });

  // 어드민 데이터 상태
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);

  // 시즌 생성 폼
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    inningsPerGame: "7",
    mercyRuleDiff: "10",
    isActive: true,
  });

  const isAdmin = session?.user?.role === "ADMIN";

  // 기본 정보 로드
  useEffect(() => {
    async function loadMyProfile() {
      try {
        const res = await fetch("/api/stats?userId=" + session?.user?.id);
        if (res.ok) {
          const data = await res.json();
          setProfileForm((prev) => ({
            ...prev,
            jerseyNumber: data.user.jerseyNumber?.toString() || "",
            primaryPosition: data.user.primaryPosition || "DH",
            battingHand: data.user.battingHand || "R",
            throwingHand: data.user.throwingHand || "R",
            // 전화번호는 API에서 마스킹 형태로 오거나 마이페이지 정보 로드를 따로 짤 수 있지만,
            // 수정 시 새로 채워 쓰거나 빈칸일 시 기존값 유지하도록 처리함.
          }));
          // Conduct info moved to /attendance
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (session?.user?.id) {
      loadMyProfile();
    }
  }, [session]);

  // 어드민 기능 데이터 로드
  const loadAdminData = async () => {
    if (!isAdmin) return;
    try {
      // 1. 멤버 목록
      const mRes = await fetch("/api/admin/members");
      if (mRes.ok) setMembers(await mRes.ok ? await mRes.json() : []);

      // 2. 가입 대기
      const rRes = await fetch("/api/admin/invitations");
      if (rRes.ok) setJoinRequests(await rRes.json());

      // 3. 시즌
      const sRes = await fetch("/api/seasons");
      if (sRes.ok) setSeasons(await sRes.json());

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin, activeSubTab]);

  // 프로필 수정 제출
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "수정에 실패했습니다.");
      } else {
        setProfileSuccess(data.message);
        // 비밀번호 필드 초기화
        setProfileForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
        // 세션 데이터 업데이트 유도
        updateSession();
      }
    } catch (err) {
      setProfileError("네트워크 서버 오류");
    } finally {
      setIsLoading(false);
    }
  };

  // 가입 신청 승인/거절 액션 (교사)
  const handleRequestAction = async (invitationId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action }),
      });

      if (res.ok) {
        loadAdminData(); // 갱신
      } else {
        const data = await res.json();
        alert(data.error || "처리 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 부원 권한/상태 수정 액션 (교사)
  const handleMemberUpdate = async (targetUserId: string, updates: { role?: string; status?: string }) => {
    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, ...updates }),
      });

      if (res.ok) {
        loadAdminData();
      } else {
        const data = await res.json();
        alert(data.error || "수정 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 시즌 마감 액션 (교사)
  const handleCloseSeason = async (seasonId: string) => {
    if (!confirm("정말로 이 시즌을 수동 마감하시겠습니까? 마감 시 이 시즌에 등록된 모든 비활성(INACTIVE) 부원의 출결 및 성적 정보가 영구 폐기되며 복구가 불가능합니다. (백업용 스냅샷은 서버 로컬에 안전히 저장됩니다.)")) {
      return;
    }

    try {
      const res = await fetch(`/api/seasons/${seasonId}/close`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadAdminData();
      } else {
        alert(data.error || "시즌 마감 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 시즌 생성 제출
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seasonForm),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setSeasonForm({
          name: "",
          startDate: "",
          endDate: "",
          inningsPerGame: "7",
          mercyRuleDiff: "10",
          isActive: true,
        });
        loadAdminData();
      } else {
        alert(data.error || "시즌 생성 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <div className="space-y-6">
      
      {/* 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">설정 및 관리 콘솔</h1>
        <p className="text-xs text-muted-foreground">개인 프로필 수정 및 클럽 운영 어드민 패널을 설정합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* 1. 사이드 카테고리 메뉴 */}
        <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-4 rounded-3xl h-fit space-y-1.5 shadow-sm">
          <button
            onClick={() => setActiveSubTab("profile")}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors ${
              activeSubTab === "profile"
                ? "bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark shadow-sm"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <User className="w-4 h-4" />
            내 프로필 편집
          </button>

          {isAdmin && (
            <>
              <div className="text-[10px] text-muted-foreground font-black px-4 pt-4 pb-1 uppercase tracking-wider">교사 어드민 메뉴</div>
              
              <button
                onClick={() => setActiveSubTab("members")}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors ${
                  activeSubTab === "members"
                    ? "bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <Users className="w-4 h-4" />
                부원 권한 관리
              </button>

              <button
                onClick={() => setActiveSubTab("requests")}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors ${
                  activeSubTab === "requests"
                    ? "bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                가입 승인 대기 ({joinRequests.length})
              </button>

              <button
                onClick={() => setActiveSubTab("seasons")}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors ${
                  activeSubTab === "seasons"
                    ? "bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
                시즌 일정 관리
              </button>


            </>
          )}
        </div>

        {/* 2. 상세 설정 폼 패널 */}
        <div className="md:col-span-3 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm">
          
          {/* A. 내 프로필 편집 */}
          {activeSubTab === "profile" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-customBorder-light dark:border-customBorder-dark pb-3">
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  프로필 세부 설정
                </h2>
                
                {/* 다크모드 토글 스위치 */}
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="px-3 py-1.5 bg-muted dark:bg-muted-foreground/10 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  {darkMode === "dark" ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-primary-light" />}
                  {darkMode === "dark" ? "라이트모드로" : "다크모드로"}
                </button>
              </div>

              {profileError && (
                <div className="flex items-center gap-2 p-3 bg-danger-light/10 text-danger-light text-xs rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  <span>{profileError}</span>
                </div>
              )}
              {profileSuccess && (
                <div className="flex items-center gap-2 p-3 bg-success-light/10 text-success-light text-xs rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{profileSuccess}</span>
                </div>
              )}


              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">이름</label>
                    <input
                      type="text"
                      value={session?.user?.name || ""}
                      className="w-full px-3 py-2 text-xs bg-muted/40 border border-customBorder-light rounded-xl cursor-not-allowed"
                      disabled
                    />
                    <span className="text-[10px] text-muted-foreground block">이름과 학번은 교사(ADMIN)만 수정 가능합니다.</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">학번</label>
                    <input
                      type="text"
                      value={session?.user?.loginId || ""}
                      className="w-full px-3 py-2 text-xs bg-muted/40 border border-customBorder-light rounded-xl cursor-not-allowed"
                      disabled
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">등번호</label>
                    <input
                      type="number"
                      value={profileForm.jerseyNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, jerseyNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">주포지션</label>
                    <select
                      value={profileForm.primaryPosition}
                      onChange={(e) => setProfileForm({ ...profileForm, primaryPosition: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    >
                      <option value="P">투수 (P)</option>
                      <option value="C">포수 (C)</option>
                      <option value="1B">1루수 (1B)</option>
                      <option value="2B">2루수 (2B)</option>
                      <option value="3B">3루수 (3B)</option>
                      <option value="SS">유격수 (SS)</option>
                      <option value="LF">좌익수 (LF)</option>
                      <option value="CF">중견수 (CF)</option>
                      <option value="RF">우익수 (RF)</option>
                      <option value="DH">지명타자 (DH)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">타석</label>
                    <select
                      value={profileForm.battingHand}
                      onChange={(e) => setProfileForm({ ...profileForm, battingHand: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    >
                      <option value="R">우타</option>
                      <option value="L">좌타</option>
                      <option value="S">양타</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">투구</label>
                    <select
                      value={profileForm.throwingHand}
                      onChange={(e) => setProfileForm({ ...profileForm, throwingHand: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    >
                      <option value="R">우투</option>
                      <option value="L">좌투</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground">연락처 번호 (수정 시 입력)</label>
                    <input
                      type="text"
                      placeholder="010-XXXX-XXXX 형식으로 입력"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-customBorder-light dark:border-customBorder-dark sm:col-span-2 pt-4">
                    <h3 className="text-xs font-bold mb-3">비밀번호 변경 (선택)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xxs text-muted-foreground">현재 비밀번호</label>
                        <input
                          type="password"
                          value={profileForm.currentPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xxs text-muted-foreground">새 비밀번호</label>
                        <input
                          type="password"
                          value={profileForm.newPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white font-bold text-xs rounded-xl shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? "저장 중..." : "개인 정보 저장"}
                </button>
              </form>
            </div>
          )}

          {/* B. 부원 권한 관리 (교사) */}
          {activeSubTab === "members" && isAdmin && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2">부원 권한 및 상태 설정</h2>
              <div className="overflow-x-auto border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                <table className="w-full text-center text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                      <th className="p-3 text-left">부원명 (학번)</th>
                      <th className="p-3">등번호/포지션</th>
                      <th className="p-3">역할 (권한)</th>
                      <th className="p-3">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id} className="border-b border-customBorder-light dark:border-customBorder-dark last:border-0">
                        <td className="p-3 text-left font-bold">
                          {m.name} ({m.loginId})
                        </td>
                        <td className="p-3">#{m.jerseyNumber ?? "-"} / {m.primaryPosition || "-"}</td>
                        <td className="p-2">
                          <select
                            value={m.role}
                            onChange={(e) => handleMemberUpdate(m.id, { role: e.target.value })}
                            className="bg-white dark:bg-surface-dark border rounded-lg px-2 py-1 focus:outline-none"
                            disabled={m.id === session?.user?.id}
                          >
                            <option value="MEMBER">일반 부원</option>
                            <option value="MANAGER">매니저</option>
                            <option value="ADMIN">교사 (ADMIN)</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={m.status}
                            onChange={(e) => handleMemberUpdate(m.id, { status: e.target.value })}
                            className={`border rounded-lg px-2 py-1 focus:outline-none font-bold ${
                              m.status === "ACTIVE" ? "text-success-light" : "text-danger-light"
                            }`}
                            disabled={m.id === session?.user?.id}
                          >
                            <option value="ACTIVE">활성</option>
                            <option value="INACTIVE">비활성 (탈퇴/졸업)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* C. 가입 승인 대기 목록 (교사) */}
          {activeSubTab === "requests" && isAdmin && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2">신규 가입 신청 대기자 명단</h2>
              <div className="space-y-3">
                {joinRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">가입 대기중인 부원이 없습니다.</p>
                ) : (
                  joinRequests.map((req) => (
                    <div key={req.id} className="p-4 border border-customBorder-light dark:border-customBorder-dark rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-xs font-bold">{req.applicantName}</span>
                        <p className="text-[10px] text-muted-foreground">학번: {req.applicantLoginId} | 신청시간: {new Date(req.createdAt).toLocaleString("ko-KR")}</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleRequestAction(req.id, "REJECT")}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors"
                        >
                          거절
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, "APPROVE")}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-primary-light hover:bg-primary-light/95 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          승인
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* D. 시즌 일정 관리 (교사) */}
          {activeSubTab === "seasons" && isAdmin && (
            <div className="space-y-6">
              
              {/* 시즌 생성 폼 */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1">새 시즌 생성</h3>
                <form onSubmit={handleCreateSeason} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-xxs text-muted-foreground font-bold">시즌 명칭 *</label>
                    <input
                      type="text"
                      placeholder="예: 2026 하반기 리그"
                      value={seasonForm.name}
                      onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xxs text-muted-foreground font-bold">정규 이닝수 (기본 7) *</label>
                    <input
                      type="number"
                      value={seasonForm.inningsPerGame}
                      onChange={(e) => setSeasonForm({ ...seasonForm, inningsPerGame: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xxs text-muted-foreground font-bold">시작일 *</label>
                    <input
                      type="date"
                      value={seasonForm.startDate}
                      onChange={(e) => setSeasonForm({ ...seasonForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xxs text-muted-foreground font-bold">종료일 *</label>
                    <input
                      type="date"
                      value={seasonForm.endDate}
                      onChange={(e) => setSeasonForm({ ...seasonForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-surface-dark border border-customBorder-light rounded-xl focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="sm:col-span-2 py-2.5 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1"
                  >
                    시즌 개막 생성
                  </button>
                </form>
              </div>

              {/* 시즌 목록 및 마감 처리 */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1">시즌 관리 대장</h3>
                <div className="space-y-2.5">
                  {seasons.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 border border-customBorder-light dark:border-customBorder-dark rounded-2xl flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold">{s.name}</span>
                        <p className="text-[10px] text-muted-foreground">
                          기간: {s.startDate.substring(0, 10)} ~ {s.endDate.substring(0, 10)}
                        </p>
                      </div>
                      
                      {s.isActive ? (
                        <button
                          onClick={() => handleCloseSeason(s.id)}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl shadow-sm transition-colors"
                        >
                          수동 시즌 마감
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-bold">마감됨</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}


        </div>

      </div>

    </div>
  );
}
