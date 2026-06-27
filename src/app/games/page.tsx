"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Plus, 
  AlertCircle, 
  Check, 
  X, 
  ChevronRight, 
  Users,
  Award
} from "lucide-react";

export default function GamesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const autoOpenRegister = searchParams.get("register") === "true";

  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [games, setGames] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"scheduled" | "confirmed">("scheduled");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 경기 등록 폼 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    gameDate: "",
    location: "",
    opponentName: "",
    gameType: "LEAGUE", // PRACTICE, LEAGUE, TOURNAMENT, FRIENDLY
    attendanceDeadline: "",
  });

  // 불참 사유 입력 팝업 상태
  const [absentGameId, setAbsentGameId] = useState<string | null>(null);
  const [absentReason, setAbsentReason] = useState("");

  // 1. 시즌 로드
  useEffect(() => {
    async function loadSeasons() {
      try {
        const res = await fetch("/api/seasons");
        if (res.ok) {
          const data = await res.json();
          setSeasons(data);
          const active = data.find((s: any) => s.isActive);
          if (active) {
            setSelectedSeasonId(active.id);
          } else if (data.length > 0) {
            setSelectedSeasonId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSeasons();
  }, []);

  // 2. 단축 링크 진입 처리
  useEffect(() => {
    if (autoOpenRegister && session?.user?.role === "ADMIN") {
      setIsModalOpen(true);
    }
  }, [autoOpenRegister, session]);

  // 3. 경기 목록 로드
  const loadGames = async () => {
    if (!selectedSeasonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = activeTab === "confirmed" ? "CONFIRMED" : ""; // 예정된건 필터없이 가져와 프론트에서 분기처리
      const res = await fetch(`/api/games?seasonId=${selectedSeasonId}`);
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      } else {
        setError("경기 목록을 가져오지 못했습니다.");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, [selectedSeasonId, activeTab]);

  // 4. 경기 등록 처리
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const { gameDate, location, opponentName, gameType, attendanceDeadline } = formData;

    if (!gameDate || !location || !opponentName || !gameType || !attendanceDeadline) {
      setFormError("모든 필수 입력 항목을 기입해주세요.");
      return;
    }

    if (new Date(attendanceDeadline) > new Date(gameDate)) {
      setFormError("출결 마감은 경기 일시보다 이전이어야 합니다.");
      return;
    }

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "경기 등록에 실패했습니다.");
      } else {
        setIsModalOpen(false);
        setFormData({
          gameDate: "",
          location: "",
          opponentName: "",
          gameType: "LEAGUE",
          attendanceDeadline: "",
        });
        loadGames();
      }
    } catch (err) {
      setFormError("네트워크 에러가 발생했습니다.");
    }
  };

  // 5. 학생 출결 응답 토글 처리
  const handleAttendanceResponse = async (gameId: string, response: "ATTEND" | "ABSENT", reason: string = "") => {
    try {
      const res = await fetch(`/api/games/${gameId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, absentReason: reason }),
      });

      if (res.ok) {
        loadGames(); // 새로고침
        setAbsentGameId(null);
        setAbsentReason("");
      } else {
        const data = await res.json();
        alert(data.error || "출결 처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  // 필터링 적용
  const filteredGames = games.filter((game) => {
    if (activeTab === "confirmed") {
      return game.status === "CONFIRMED";
    } else {
      return game.status !== "CONFIRMED";
    }
  });

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">경기 일정 및 결과</h1>
          <p className="text-xs text-muted-foreground">이번 시즌에 예정된 경기와 지난 경기 스코어보드를 확인합니다.</p>
        </div>

        <div className="flex items-center gap-3">
          {seasons.length > 0 && (
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {isStaff && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              경기 일정 등록
            </button>
          )}
        </div>
      </div>

      {/* 2. 탭 전환 */}
      <div className="flex border-b border-customBorder-light dark:border-customBorder-dark">
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "scheduled"
              ? "border-primary-light text-primary-light dark:border-primary-dark dark:text-primary-dark font-extrabold"
              : "border-transparent text-muted-foreground hover:text-customText-light"
          }`}
        >
          다가오는 경기 ({games.filter((g) => g.status !== "CONFIRMED").length})
        </button>
        <button
          onClick={() => setActiveTab("confirmed")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === "confirmed"
              ? "border-primary-light text-primary-light dark:border-primary-dark dark:text-primary-dark font-extrabold"
              : "border-transparent text-muted-foreground hover:text-customText-light"
          }`}
        >
          기록 확정 경기 ({games.filter((g) => g.status === "CONFIRMED").length})
        </button>
      </div>

      {/* 에러 상태 */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-light/10 text-danger-light text-xs rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. 경기 목록 렌더링 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark mx-auto"></div>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-customBorder-light dark:border-customBorder-dark rounded-3xl text-sm text-muted-foreground">
          조건에 부합하는 경기 일정이 아직 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredGames.map((game) => {
            const myResponse = game.attendances?.[0]?.response || "UNDECIDED";
            const deadlinePassed = new Date() > new Date(game.attendanceDeadline);
            
            return (
              <div
                key={game.id}
                className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* 상단 뱃지 */}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] px-2 py-0.5 font-semibold bg-primary-light/5 text-primary-light dark:text-primary-dark rounded-md border border-primary-light/10">
                    {game.gameType === "LEAGUE" ? "리그전" : game.gameType === "PRACTICE" ? "연습경기" : game.gameType === "TOURNAMENT" ? "토너먼트" : "친선전"}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    game.status === "CONFIRMED"
                      ? "text-success-light"
                      : game.status === "RECORD_PENDING"
                      ? "text-warning-light"
                      : game.status === "IN_PROGRESS"
                      ? "text-indigo-500"
                      : "text-muted-foreground"
                  }`}>
                    {game.status === "CONFIRMED"
                      ? "기록 확정"
                      : game.status === "RECORD_PENDING"
                      ? "기록 입력 대기"
                      : game.status === "IN_PROGRESS"
                      ? "경기 진행 중"
                      : "예정됨"}
                  </span>
                </div>

                {/* 상대팀 정보 */}
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black">vs {game.opponentName}</h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(game.gameDate).toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{game.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* 스코어보드 (종료 경기일 때) */}
                  {game.status === "CONFIRMED" && (
                    <div className="text-right space-y-1">
                      <div className="text-2xl font-black">
                        {game.ourScore} : {game.opponentScore}
                      </div>
                      <span className={`text-xxs px-2 py-0.5 font-bold rounded-md ${
                        game.result === "WIN"
                          ? "bg-success-light/10 text-success-light border border-success-light/20"
                          : game.result === "LOSS"
                          ? "bg-danger-light/10 text-danger-light border border-danger-light/20"
                          : "bg-muted-foreground/10 text-muted-foreground border border-muted-foreground/20"
                      }`}>
                        {game.result === "WIN" ? "WIN" : game.result === "LOSS" ? "LOSE" : "DRAW"}
                      </span>
                    </div>
                  )}
                </div>

                {/* 하단 사전 출결 체크 영역 (예정 경기일 때 노출) */}
                {game.status !== "CONFIRMED" && (
                  <div className="pt-4 border-t border-customBorder-light dark:border-customBorder-dark space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>출결 마감: {new Date(game.attendanceDeadline).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <span className={`text-xxs font-extrabold px-2 py-0.5 rounded-full ${
                        myResponse === "ATTEND"
                          ? "bg-success-light/10 text-success-light"
                          : myResponse === "ABSENT"
                          ? "bg-danger-light/10 text-danger-light"
                          : "bg-warning-light/10 text-warning-light"
                      }`}>
                        내 선택: {myResponse === "ATTEND" ? "참석" : myResponse === "ABSENT" ? "불참" : "미정"}
                      </span>
                    </div>

                    {!deadlinePassed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAttendanceResponse(game.id, "ATTEND")}
                          className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 border transition-all ${
                            myResponse === "ATTEND"
                              ? "bg-success-light text-white border-success-light shadow-md"
                              : "bg-transparent hover:bg-muted border-customBorder-light dark:border-customBorder-dark"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" /> 참석
                        </button>
                        <button
                          onClick={() => {
                            setAbsentGameId(game.id);
                            setAbsentReason("");
                          }}
                          className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 border transition-all ${
                            myResponse === "ABSENT"
                              ? "bg-danger-light text-white border-danger-light shadow-md"
                              : "bg-transparent hover:bg-muted border-customBorder-light dark:border-customBorder-dark"
                          }`}
                        >
                          <X className="w-3.5 h-3.5" /> 불참
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-center text-muted-foreground">출결 응답이 마감되었습니다. 변경이 불가능합니다.</div>
                    )}
                  </div>
                )}

                {/* 상세 페이지 이동 버튼 */}
                <div className="pt-2">
                  <Link
                    href={`/games/${game.id}`}
                    className="w-full py-2 bg-muted hover:bg-muted/80 dark:bg-muted-foreground/5 dark:hover:bg-muted-foreground/10 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    상세보기 및 라인업/기록 관리
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 4. 경기 등록 모달 (교사/매니저 전용) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-customBorder-light dark:border-customBorder-dark pb-3">
              <h2 className="text-md font-bold">새 경기 등록</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-danger-light/10 text-danger-light text-xs rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">상대팀명 *</label>
                <input
                  type="text"
                  placeholder="예: 강남고등학교"
                  value={formData.opponentName}
                  onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">경기 유형 *</label>
                  <select
                    value={formData.gameType}
                    onChange={(e) => setFormData({ ...formData, gameType: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                  >
                    <option value="LEAGUE">리그전</option>
                    <option value="PRACTICE">연습경기</option>
                    <option value="TOURNAMENT">토너먼트</option>
                    <option value="FRIENDLY">친선전</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">경기 장소 *</label>
                  <input
                    type="text"
                    placeholder="예: 학교 운동장"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">경기 일시 *</label>
                <input
                  type="datetime-local"
                  value={formData.gameDate}
                  onChange={(e) => setFormData({ ...formData, gameDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">출결 응답 마감 *</label>
                <input
                  type="datetime-local"
                  value={formData.attendanceDeadline}
                  onChange={(e) => setFormData({ ...formData, attendanceDeadline: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-primary-light hover:bg-primary-light/90 dark:bg-primary-dark dark:text-customBg-dark font-bold text-xs rounded-xl shadow-md active:scale-98 transition-all"
              >
                경기 생성 및 전체 알림 전송
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. 불참 사유 작성 모달 */}
      {absentGameId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-sm font-bold">불참 사유 작성</h2>
              <p className="text-xxs text-muted-foreground">불참하시는 사유를 간단히 적어주세요. (선택)</p>
            </div>

            <input
              type="text"
              placeholder="예: 학원 일정, 감기 몸살 등"
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setAbsentGameId(null)}
                className="py-2 bg-muted hover:bg-muted/80 text-xs font-bold rounded-xl"
              >
                취소
              </button>
              <button
                onClick={() => handleAttendanceResponse(absentGameId, "ABSENT", absentReason)}
                className="py-2 bg-danger-light text-white font-bold text-xs rounded-xl shadow-md"
              >
                불참 제출
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
