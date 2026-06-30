"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  Plus, 
  AlertCircle, 
  Check, 
  X, 
  ChevronRight,
  ChevronLeft
} from "lucide-react";

export default function GamesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const autoOpenRegister = searchParams.get("register") === "true";

  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 캘린더 상태
  const [currentDate, setCurrentDate] = useState(new Date());

  // 경기 등록 폼 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    gameDate: "",
    location: "",
    opponentName: "",
    gameType: "LEAGUE", 
    attendanceDeadline: "",
  });

  // 불참 사유 입력 팝업 상태
  const [absentGameId, setAbsentGameId] = useState<string | null>(null);
  const [absentReason, setAbsentReason] = useState("");

  useEffect(() => {
    async function loadSeasons() {
      try {
        const res = await fetch("/api/seasons");
        if (res.ok) {
          const data = await res.json();
          setSeasons(data);
          const active = data.find((s: any) => s.isActive);
          if (active) setSelectedSeasonId(active.id);
          else if (data.length > 0) setSelectedSeasonId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSeasons();
  }, []);

  useEffect(() => {
    if (autoOpenRegister && session?.user?.role === "ADMIN") {
      setIsModalOpen(true);
    }
  }, [autoOpenRegister, session]);

  const loadGames = async () => {
    if (!selectedSeasonId) return;
    setIsLoading(true);
    setError(null);
    try {
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
  }, [selectedSeasonId]);

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
        body: JSON.stringify({ seasonId: selectedSeasonId, ...formData }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "경기 등록에 실패했습니다.");
      } else {
        setIsModalOpen(false);
        setFormData({ gameDate: "", location: "", opponentName: "", gameType: "LEAGUE", attendanceDeadline: "" });
        loadGames();
      }
    } catch (err) {
      setFormError("네트워크 에러가 발생했습니다.");
    }
  };

  const handleAttendanceResponse = async (gameId: string, response: "ATTEND" | "ABSENT", reason: string = "") => {
    try {
      const res = await fetch(`/api/games/${gameId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, absentReason: reason }),
      });

      if (res.ok) {
        loadGames();
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

  // 캘린더 관련 계산
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">훈련 및 경기 일정 (캘린더)</h1>
          <p className="text-xs text-muted-foreground">시즌 훈련 및 경기 일정을 한눈에 확인합니다.</p>
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

      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-light/10 text-danger-light text-xs rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 캘린더 UI */}
      <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 shadow-sm">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="p-2 hover:bg-muted dark:hover:bg-muted-foreground/10 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">{year}년 {month + 1}월</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-muted dark:hover:bg-muted-foreground/10 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-px mb-2 text-center text-xs font-bold text-muted-foreground">
          <div className="text-danger-light">일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div className="text-primary-light">토</div>
        </div>

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-px bg-customBorder-light dark:bg-customBorder-dark border border-customBorder-light dark:border-customBorder-dark rounded-xl overflow-hidden">
          {days.map((day, idx) => {
            const isToday = day && year === new Date().getFullYear() && month === new Date().getMonth() && day === new Date().getDate();
            
            // 이 날짜에 해당하는 경기 필터링
            const dayGames = day ? games.filter(g => {
              const gameDate = new Date(g.gameDate);
              return gameDate.getFullYear() === year && gameDate.getMonth() === month && gameDate.getDate() === day;
            }) : [];

            return (
              <div key={idx} className={`min-h-[120px] bg-surface-light dark:bg-surface-dark p-2 flex flex-col ${!day ? 'bg-muted/30 dark:bg-muted-foreground/5' : ''}`}>
                {day && (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark shadow-sm' : ''}`}>
                        {day}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 overflow-y-auto">
                      {dayGames.map(g => (
                        <Link key={g.id} href={`/games/${g.id}`} className="block">
                          <div className={`p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow ${
                            g.status === "CONFIRMED" ? "bg-success-light/10 border-success-light/30 text-success-light" :
                            g.status === "RECORD_PENDING" ? "bg-warning-light/10 border-warning-light/30 text-warning-light" :
                            "bg-primary-light/5 border-primary-light/20 text-primary-light dark:text-primary-dark"
                          }`}>
                            <div className="font-bold flex items-center justify-between mb-1">
                              <span className="truncate pr-1">vs {g.opponentName}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-80 text-[10px]">
                              <Clock className="w-3 h-3" />
                              {new Date(g.gameDate).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {g.status === "CONFIRMED" && (
                              <div className="mt-1 font-bold">
                                {g.ourScore} : {g.opponentScore} {g.result === "WIN" ? "(승)" : g.result === "LOSS" ? "(패)" : "(무)"}
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 경기 등록 모달 (생략/유지) */}
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
                    <option value="TRAINING">훈련</option>
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
                경기 생성
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
