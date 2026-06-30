"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  MapPin, 
  ChevronLeft, 
  Users, 
  Edit, 
  CheckSquare, 
  Plus, 
  Trophy, 
  Trash2,
  Lock,
  UserPlus,
  AlertCircle,
  X
} from "lucide-react";

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const gameId = params.id;

  const [game, setGame] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"score" | "attendance" | "lineup" | "records">("score");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);
  
  // 당일 출석 체크용 임시 상태
  const [tempAttendances, setTempAttendances] = useState<any[]>([]);

  // 라인업 등록용 임시 상태
  const [tempLineup, setTempLineup] = useState<any[]>([]); // 1~9번 선발진
  const [startingPitcherId, setStartingPitcherId] = useState<string>("");
  const [substitutes, setSubstitutes] = useState<any[]>([]); // 교체 선수

  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  // 1. 경기 정보 로드
  const loadGameData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);
        
        // 당일 출석 임시 상태 초기화
        if (data.attendances) {
          setTempAttendances(
            data.attendances.map((a: any) => ({
              userId: a.user.id,
              name: a.user.name,
              jerseyNumber: a.user.jerseyNumber,
              response: a.response,
              actualAttended: a.actualAttended,
              actualStatus: a.actualStatus,
            }))
          );
        }

        // 라인업 임시 상태 초기화
        if (data.lineups) {
          const starters = data.lineups.filter((l: any) => l.isStarter);
          const subs = data.lineups.filter((l: any) => !l.isStarter);
          
          // 1~9번 빈배열 생성 후 매칭 채워넣기
          const sortedStarters = Array.from({ length: 9 }, (_, i) => {
            const found = starters.find((s: any) => s.battingOrder === i + 1);
            return found ? { userId: found.userId, position: found.position } : { userId: "", position: "" };
          });
          setTempLineup(sortedStarters);

          const sp = starters.find((s: any) => s.isStartingPitcher);
          if (sp) setStartingPitcherId(sp.userId);

          setSubstitutes(subs.map((s: any) => ({ userId: s.userId, position: s.position })));
        } else {
          // 비어 있을 시 빈 라인업 기본화
          setTempLineup(Array.from({ length: 9 }, () => ({ userId: "", position: "" })));
          setSubstitutes([]);
        }

      } else {
        setError("경기를 찾을 수 없거나 접근 권한이 없습니다.");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGameData();
  }, [gameId]);

  // 2. 당일 출석 체크 제출
  const handleAttendanceSubmit = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendances: tempAttendances.map((t) => ({
            userId: t.userId,
            actualStatus: t.actualStatus,
            actualAttended: t.actualStatus === "PRESENT" || t.actualStatus === "LATE",
          })),
        }),
      });

      if (res.ok) {
        setIsAttendanceModalOpen(false);
        loadGameData();
      } else {
        const data = await res.json();
        alert(data.error || "실제 출석 저장 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. 라인업 제출
  const handleLineupSubmit = async () => {
    // 유효성 체크
    const validStarters = tempLineup.filter((s) => s.userId && s.position);
    if (validStarters.length !== 9) {
      alert("선발 라인업 9명을 완전히 지정해주세요.");
      return;
    }

    if (!startingPitcherId) {
      alert("선발 투수를 지정해주세요.");
      return;
    }

    // 선발 투수가 선발 라인업에 있는지 확인
    const isSpInStarters = tempLineup.some((s) => s.userId === startingPitcherId);
    if (!isSpInStarters) {
      alert("선발 투수는 선발 라인업 9명 중에서만 지정할 수 있습니다.");
      return;
    }

    // 포지션 중복 체크
    const positions = tempLineup.map((s) => s.position);
    if (new Set(positions).size !== 9) {
      alert("선발 9명의 수비 포지션이 서로 중복될 수 없습니다.");
      return;
    }

    // 선수 중복 체크
    const allUserIds = [
      ...tempLineup.map((s) => s.userId),
      ...substitutes.map((s) => s.userId),
    ];
    if (new Set(allUserIds).size !== allUserIds.length) {
      alert("라인업에 중복 등록된 선수가 있습니다.");
      return;
    }

    // 데이터 조합
    const payload = [
      ...tempLineup.map((s, idx) => ({
        userId: s.userId,
        battingOrder: idx + 1,
        position: s.position,
        isStarter: true,
        isStartingPitcher: s.userId === startingPitcherId,
      })),
      ...substitutes.map((s) => ({
        userId: s.userId,
        battingOrder: null,
        position: s.position,
        isStarter: false,
        isStartingPitcher: false,
      })),
    ];

    try {
      const res = await fetch(`/api/games/${gameId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineups: payload }),
      });

      if (res.ok) {
        setIsLineupModalOpen(false);
        loadGameData();
      } else {
        const data = await res.json();
        alert(data.error || "라인업 저장 실패");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. 경기 일정 삭제 처리
  const handleDeleteGame = async () => {
    if (!confirm("정말로 이 경기 일정을 삭제하시겠습니까? 등록된 모든 출결/라인업 기록도 영구 폐기됩니다.")) {
      return;
    }

    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/games");
      } else {
        const data = await res.json();
        alert(data.error || "삭제 실패");
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

  if (error || !game) {
    return (
      <div className="p-8 text-center text-danger-light">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-semibold">{error || "경기를 찾을 수 없습니다."}</p>
        <Link href="/games" className="text-xs text-primary-light hover:underline mt-4 inline-block">
          경기 일정 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 출결 현황 집계
  const attendCount = game.attendances.filter((a: any) => a.response === "ATTEND").length;
  const absentCount = game.attendances.filter((a: any) => a.response === "ABSENT").length;
  const undecidedCount = game.attendances.filter((a: any) => a.response === "UNDECIDED").length;
  const actualAttendCount = game.attendances.filter((a: any) => a.actualStatus === "PRESENT" || a.actualStatus === "LATE" || (a.actualStatus === "UNKNOWN" && a.actualAttended)).length;

  // 당일 실제 출석 체크자 목록 (라인업 드롭다운용)
  const actualAttendedMembers = game.attendances.filter((a: any) => a.actualStatus === "PRESENT" || a.actualStatus === "LATE" || (a.actualStatus === "UNKNOWN" && a.actualAttended));

  // 이닝 스코어 파싱
  let parsedInningScores = [];
  try {
    parsedInningScores = JSON.parse(game.inningScores || "[]");
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 경로 네비게이션 & 관리 버튼 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href="/games" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-customText-light">
          <ChevronLeft className="w-4 h-4" />
          일정 목록으로
        </Link>

        {isStaff && game.status !== "CONFIRMED" && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsAttendanceModalOpen(true)}
              className="px-3 py-1.5 bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark text-xs rounded-xl font-medium hover:bg-muted transition-colors flex items-center gap-1"
            >
              <CheckSquare className="w-4 h-4" />
              당일 출석체크
            </button>
            <button
              onClick={() => setIsLineupModalOpen(true)}
              className="px-3 py-1.5 bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark text-xs rounded-xl font-medium hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Users className="w-4 h-4" />
              라인업 설정
            </button>
            <button
              onClick={handleDeleteGame}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-xl font-medium transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 2. 경기 핵심 정보 카드 */}
      <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] px-2 py-0.5 font-semibold bg-primary-light/5 text-primary-light dark:text-primary-dark rounded-md border border-primary-light/10">
              {game.gameType === "LEAGUE" ? "리그전" : game.gameType === "PRACTICE" ? "연습경기" : game.gameType === "TOURNAMENT" ? "토너먼트" : game.gameType === "TRAINING" ? "훈련" : "친선전"}
            </span>
            <h1 className="text-2xl font-black">vs {game.opponentName}</h1>
          </div>

          <div className="text-right">
            <span className={`text-xxs px-2 py-1 font-bold rounded-full ${
              game.status === "CONFIRMED" ? "bg-success-light/10 text-success-light" : "bg-warning-light/10 text-warning-light"
            }`}>
              {game.status === "CONFIRMED" ? "기록 확정 완료" : "경기 진행/대기중"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>일시: {new Date(game.gameDate).toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>장소: {game.location}</span>
          </div>
        </div>
      </div>

      {/* 3. 탭 버튼 */}
      <div className="flex border-b border-customBorder-light dark:border-customBorder-dark">
        {[
          { id: "score", name: "스코어보드" },
          { id: "attendance", name: "사전 출결 현황" },
          { id: "lineup", name: "선발 라인업" },
          { id: "records", name: "경기 기록 스탯" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-primary-light text-primary-light dark:border-primary-dark dark:text-primary-dark font-extrabold"
                : "border-transparent text-muted-foreground hover:text-customText-light"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 4. 탭 콘텐츠 영역 */}
      <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm min-h-[300px]">
        
        {/* A. 스코어보드 탭 */}
        {activeTab === "score" && (
          <div className="space-y-6">
            <div className="text-center space-y-2 py-4">
              <span className="text-xs text-muted-foreground">FINAL SCORE</span>
              <div className="flex items-center justify-center gap-8">
                <div>
                  <div className="text-sm font-bold">우리팀</div>
                  <div className="text-4xl font-black">{game.ourScore}</div>
                </div>
                <div className="text-2xl text-muted-foreground">:</div>
                <div>
                  <div className="text-sm font-bold">{game.opponentName}</div>
                  <div className="text-4xl font-black">{game.opponentScore}</div>
                </div>
              </div>
              {game.status === "CONFIRMED" && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-success-light bg-success-light/5 border border-success-light/20 px-3 py-1 rounded-full mt-2">
                  <Trophy className="w-3.5 h-3.5" />
                  {game.result === "WIN" ? "우리팀 승리!" : game.result === "LOSS" ? "상대팀 승리" : "무승부"}
                </div>
              )}
            </div>

            {/* 이닝 스코어 테이블 */}
            {parsedInningScores.length > 0 && (
              <div className="overflow-x-auto border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                <table className="w-full text-center text-xs">
                  <thead>
                    <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                      <th className="p-3 text-left">팀</th>
                      {parsedInningScores.map((score: any) => (
                        <th key={score.inning} className="p-3 font-semibold">{score.inning}</th>
                      ))}
                      <th className="p-3 font-black bg-muted/60 dark:bg-muted-foreground/20">R</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-customBorder-light dark:border-customBorder-dark">
                      <td className="p-3 text-left font-bold">우리팀</td>
                      {parsedInningScores.map((score: any) => (
                        <td key={score.inning} className="p-3">{score.our ?? "-"}</td>
                      ))}
                      <td className="p-3 font-black bg-muted/30 dark:bg-muted-foreground/10">{game.ourScore}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-left font-bold">{game.opponentName}</td>
                      {parsedInningScores.map((score: any) => (
                        <td key={score.inning} className="p-3">{score.opp ?? "-"}</td>
                      ))}
                      <td className="p-3 font-black bg-muted/30 dark:bg-muted-foreground/10">{game.opponentScore}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* B. 출결 현황 탭 */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-muted dark:bg-muted-foreground/10 p-3 rounded-2xl">
                <div className="text-xxs text-muted-foreground">참석</div>
                <div className="text-lg font-black text-success-light">{attendCount}명</div>
              </div>
              <div className="bg-muted dark:bg-muted-foreground/10 p-3 rounded-2xl">
                <div className="text-xxs text-muted-foreground">불참</div>
                <div className="text-lg font-black text-danger-light">{absentCount}명</div>
              </div>
              <div className="bg-muted dark:bg-muted-foreground/10 p-3 rounded-2xl">
                <div className="text-xxs text-muted-foreground">미정</div>
                <div className="text-lg font-black text-warning-light">{undecidedCount}명</div>
              </div>
              <div className="bg-primary-light/5 border border-primary-light/10 p-3 rounded-2xl">
                <div className="text-xxs text-muted-foreground">현장 실제 출석</div>
                <div className="text-lg font-black text-primary-light dark:text-primary-dark">{actualAttendCount}명</div>
              </div>
            </div>

            {/* 출결 명단 분류 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-success-light">참석 부원 명단 ({attendCount}명)</h3>
                <div className="flex flex-wrap gap-2">
                  {game.attendances.filter((a: any) => a.response === "ATTEND").length === 0 ? (
                    <span className="text-xs text-muted-foreground">참석 예정자가 아직 없습니다.</span>
                  ) : (
                    game.attendances.filter((a: any) => a.response === "ATTEND").map((a: any) => (
                      <span key={a.id} className="px-3 py-1.5 bg-success-light/5 border border-success-light/10 text-xs rounded-xl font-medium">
                        #{a.user.jerseyNumber ?? "-"} {a.user.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-danger-light">불참 부원 명단 ({absentCount}명)</h3>
                <div className="space-y-2">
                  {game.attendances.filter((a: any) => a.response === "ABSENT").length === 0 ? (
                    <span className="text-xs text-muted-foreground">불참 예정자가 없습니다.</span>
                  ) : (
                    game.attendances.filter((a: any) => a.response === "ABSENT").map((a: any) => (
                      <div key={a.id} className="flex justify-between items-center p-2.5 bg-danger-light/5 border border-danger-light/10 rounded-xl text-xs">
                        <span className="font-bold">#{a.user.jerseyNumber ?? "-"} {a.user.name}</span>
                        <span className="text-xxs text-muted-foreground">{a.absentReason || "사유 미작성"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* C. 라인업 탭 */}
        {activeTab === "lineup" && (
          <div className="space-y-6">
            {game.lineups.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">라인업이 아직 구성되지 않았습니다.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 선발 라인업 타순 테이블 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold">선발 명단 (1~9번)</h3>
                  <div className="overflow-hidden border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                    <table className="w-full text-center text-xs">
                      <thead>
                        <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                          <th className="p-3">타순</th>
                          <th className="p-3">선수명 (등번호)</th>
                          <th className="p-3">수비 포지션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.lineups.filter((l: any) => l.isStarter).map((l: any) => (
                          <tr key={l.id} className="border-b border-customBorder-light dark:border-customBorder-dark last:border-0">
                            <td className="p-3 font-bold text-primary-light dark:text-primary-dark">{l.battingOrder}번</td>
                            <td className="p-3 font-semibold">
                              {l.user.name} (#{l.user.jerseyNumber ?? "-"})
                              {l.isStartingPitcher && (
                                <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 bg-danger-light/10 text-danger-light rounded">선발투수</span>
                              )}
                            </td>
                            <td className="p-3">{l.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 교체 명단 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold">교체 및 벤치 명단</h3>
                  <div className="flex flex-wrap gap-2">
                    {game.lineups.filter((l: any) => !l.isStarter).length === 0 ? (
                      <span className="text-xs text-muted-foreground">교체 선수가 없습니다.</span>
                    ) : (
                      game.lineups.filter((l: any) => !l.isStarter).map((l: any) => (
                        <span key={l.id} className="px-3 py-2 bg-muted dark:bg-muted-foreground/10 text-xs rounded-xl font-medium">
                          #{l.user.jerseyNumber ?? "-"} {l.user.name} ({l.position})
                        </span>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* D. 경기 기록 스탯 탭 */}
        {activeTab === "records" && (
          <div className="space-y-6">
            
            {/* 최종 확정이 안 되었을 때의 안내 화면 */}
            {game.status !== "CONFIRMED" ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-3xl">📝</div>
                <h3 className="text-sm font-bold">아직 경기 기록이 최종 확정되지 않았습니다.</h3>
                <p className="text-xxs text-muted-foreground max-w-sm mx-auto">
                  경기가 끝나고 교사/매니저가 최종 이닝 스코어와 부원별 기록을 전송하고 확정해야 통계가 노출됩니다.
                </p>
                {isStaff && (
                  <Link
                    href={`/games/${game.id}/record`}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    기록 입력 페이지 바로가기
                  </Link>
                )}
              </div>
            ) : (
              // 최종 확정 완료된 경우 스탯 테이블 노출
              <div className="space-y-8">
                {/* 교사용 확정 상태일 때 수정 가이드 */}
                {isStaff && (
                  <div className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                    <span className="text-xs font-semibold">기록이 확정되었습니다. 수정이 필요한가요?</span>
                    <Link
                      href={`/games/${game.id}/record`}
                      className="px-3 py-1.5 bg-primary-light dark:bg-primary-dark dark:text-customBg-dark text-xxs font-bold rounded-xl"
                    >
                      기록 수정하기
                    </Link>
                  </div>
                )}

                {/* 1. 타격 스탯 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1.5">
                    우리팀 타격 성적
                  </h3>
                  <div className="overflow-x-auto border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                    <table className="w-full text-center text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                          <th className="p-3 text-left">선수명</th>
                          <th className="p-3">타석</th>
                          <th className="p-3">타수</th>
                          <th className="p-3">안타</th>
                          <th className="p-3">2루타</th>
                          <th className="p-3">3루타</th>
                          <th className="p-3">홈런</th>
                          <th className="p-3">득점</th>
                          <th className="p-3">타점</th>
                          <th className="p-3">볼넷</th>
                          <th className="p-3">삼진</th>
                          <th className="p-3">도루</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.battingRecords.map((b: any) => (
                          <tr key={b.id} className="border-b border-customBorder-light dark:border-customBorder-dark last:border-0">
                            <td className="p-3 text-left font-bold">#{b.user.jerseyNumber ?? "-"} {b.user.name}</td>
                            <td className="p-3">{b.plateAppearances}</td>
                            <td className="p-3">{b.atBats}</td>
                            <td className="p-3 font-semibold text-primary-light dark:text-primary-dark">{b.hits}</td>
                            <td className="p-3">{b.doubles}</td>
                            <td className="p-3">{b.triples}</td>
                            <td className="p-3 text-success-light font-bold">{b.homeRuns}</td>
                            <td className="p-3">{b.runs}</td>
                            <td className="p-3">{b.rbis}</td>
                            <td className="p-3">{b.walks}</td>
                            <td className="p-3">{b.strikeouts}</td>
                            <td className="p-3">{b.stolenBases}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. 투구 스탯 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1.5">
                    우리팀 투구 성적
                  </h3>
                  <div className="overflow-x-auto border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                    <table className="w-full text-center text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                          <th className="p-3 text-left">선수명</th>
                          <th className="p-3">이닝</th>
                          <th className="p-3">피안타</th>
                          <th className="p-3">실점</th>
                          <th className="p-3">자책</th>
                          <th className="p-3">볼넷</th>
                          <th className="p-3">삼진</th>
                          <th className="p-3">피홈런</th>
                          <th className="p-3">투구수</th>
                          <th className="p-3">결과</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.pitchingRecords.map((p: any) => (
                          <tr key={p.id} className="border-b border-customBorder-light dark:border-customBorder-dark last:border-0">
                            <td className="p-3 text-left font-bold">#{p.user.jerseyNumber ?? "-"} {p.user.name}</td>
                            <td className="p-3 font-semibold">{p.inningsPitched}</td>
                            <td className="p-3">{p.hitsAllowed}</td>
                            <td className="p-3">{p.runsAllowed}</td>
                            <td className="p-3 text-danger-light">{p.earnedRuns}</td>
                            <td className="p-3">{p.walksAllowed}</td>
                            <td className="p-3 font-semibold text-success-light">{p.strikeouts}</td>
                            <td className="p-3">{p.homeRunsAllowed}</td>
                            <td className="p-3 text-muted-foreground">{p.pitchCount || "-"}</td>
                            <td className="p-3 font-bold text-xxs">
                              {p.decision === "WIN" && <span className="text-success-light">승리투수</span>}
                              {p.decision === "LOSS" && <span className="text-danger-light">패전투수</span>}
                              {p.decision === "SAVE" && <span className="text-primary-light">세이브</span>}
                              {p.decision === "HOLD" && <span className="text-indigo-500">홀드</span>}
                              {p.decision === "NONE" && <span className="text-muted-foreground">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 5. 당일 실제 출석 체크 모달 (교사/매니저 전용) */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="border-b border-customBorder-light dark:border-customBorder-dark pb-3 flex justify-between items-center">
              <h2 className="text-md font-bold">당일 경기 실제 출석 체크</h2>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-muted-foreground hover:text-customText-light">
                닫기
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // 사전 응답대로 일괄 설정 (PRD 5-3: 응답대로 적용)
                  setTempAttendances(
                    tempAttendances.map((t) => ({
                      ...t,
                      actualStatus: t.response === "ATTEND" ? "PRESENT" : (t.response === "ABSENT" ? "EXCUSED" : "UNEXCUSED"),
                    }))
                  );
                }}
                className="w-full py-2 bg-muted text-xxs font-bold rounded-xl"
              >
                사전 참석 응답자 일괄 출석 처리
              </button>

              <div className="space-y-2">
                {tempAttendances.map((item) => (
                  <div key={item.userId} className="flex justify-between items-center p-3 border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold">#{item.jerseyNumber ?? "-"} {item.name}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        사전응답: {item.response === "ATTEND" ? "참석" : item.response === "ABSENT" ? "불참" : "미응답"}
                      </span>
                    </div>

                    <select
                      value={item.actualStatus || "UNKNOWN"}
                      onChange={(e) => {
                        setTempAttendances(
                          tempAttendances.map((t) =>
                            t.userId === item.userId ? { ...t, actualStatus: e.target.value } : t
                          )
                        );
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border focus:outline-none transition-all ${
                        item.actualStatus === "PRESENT" ? "bg-primary-light/10 border-primary-light text-primary-light" :
                        item.actualStatus === "LATE" ? "bg-warning-light/10 border-warning-light text-warning-light" :
                        item.actualStatus === "EXCUSED" ? "bg-muted border-customBorder-light text-muted-foreground" :
                        item.actualStatus === "UNEXCUSED" ? "bg-danger-light/10 border-danger-light text-danger-light" :
                        "bg-transparent border-customBorder-light text-muted-foreground"
                      }`}
                    >
                      <option value="UNKNOWN">미정</option>
                      <option value="PRESENT">출석</option>
                      <option value="LATE">지각</option>
                      <option value="EXCUSED">사유결석</option>
                      <option value="UNEXCUSED">무단결석</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-customBorder-light dark:border-customBorder-dark flex gap-3">
              <button
                onClick={() => setIsAttendanceModalOpen(false)}
                className="w-full py-2 bg-muted hover:bg-muted/80 text-xs font-bold rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleAttendanceSubmit}
                className="w-full py-2 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white text-xs font-bold rounded-xl shadow-md"
              >
                출석정보 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 라인업 설정 모달 (교사/매니저 전용) */}
      {isLineupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-customBorder-light dark:border-customBorder-dark pb-3 flex justify-between items-center">
              <h2 className="text-md font-bold">경기 라인업 설정 및 선발 지정</h2>
              <button onClick={() => setIsLineupModalOpen(false)} className="text-muted-foreground hover:text-customText-light">
                닫기
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 선발 라인업 1~9번 */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1">
                  선발 라인업 (1~9번 타순)
                </h3>
                <div className="space-y-2">
                  {tempLineup.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs font-bold w-10 text-right">{idx + 1}번</span>
                      
                      {/* 선수 선택 */}
                      <select
                        value={line.userId}
                        onChange={(e) => {
                          const selectedUserId = e.target.value;
                          if (selectedUserId) {
                            const m = actualAttendedMembers.find((mem: any) => mem.userId === selectedUserId);
                            if (m) {
                              if (m.conductStatus === "EXPELLED") {
                                alert("퇴출 상태인 부원은 라인업에 등록할 수 없습니다.");
                                return;
                              }
                              if (m.suspensionRemaining > 0) {
                                const reason = window.prompt(`[출전 정지] 잔여 ${m.suspensionRemaining}경기 상태입니다.\n예외 등록 사유를 입력하시면 등록됩니다.`);
                                if (!reason) return; // 취소 시 등록 안 함
                                // (예외 사유 저장은 API 단에서 구현 필요하지만 여기서는 통과 허용)
                              }
                            }
                          }
                          const updated = [...tempLineup];
                          updated[idx].userId = selectedUserId;
                          setTempLineup(updated);
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                      >
                        <option value="">선수 선택 (출석자)</option>
                        {actualAttendedMembers.map((m: any) => {
                          let badge = "";
                          if (m.conductStatus === "EXPELLED") badge = " [퇴출]";
                          else if (m.suspensionRemaining > 0) badge = ` [출전정지 ${m.suspensionRemaining}]`;
                          else if (m.conductStatus === "CAUTION") badge = " [주의]";
                          return (
                            <option key={m.userId} value={m.userId} disabled={m.conductStatus === "EXPELLED"}>
                              #{m.jerseyNumber ?? "-"} {m.name}{badge}
                            </option>
                          );
                        })}
                      </select>

                      {/* 포지션 선택 */}
                      <select
                        value={line.position}
                        onChange={(e) => {
                          const updated = [...tempLineup];
                          updated[idx].position = e.target.value;
                          setTempLineup(updated);
                        }}
                        className="w-28 px-2 py-1.5 text-xs bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                      >
                        <option value="">포지션</option>
                        {["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"].map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 선발 투수 및 교체/벤치 명단 */}
              <div className="space-y-4">
                
                {/* 선발 투수 지정 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block">선발 투수 지정 *</label>
                  <select
                    value={startingPitcherId}
                    onChange={(e) => setStartingPitcherId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                  >
                    <option value="">선발 투수 선택</option>
                    {/* 선발 라인업에 배정된 선수만 표기 */}
                    {tempLineup
                      .filter((s) => s.userId)
                      .map((s) => {
                        const m = actualAttendedMembers.find((member: any) => member.userId === s.userId);
                        return m ? (
                          <option key={m.userId} value={m.userId}>
                            #{m.jerseyNumber ?? "-"} {m.name}
                          </option>
                        ) : null;
                      })}
                  </select>
                </div>

                {/* 교체 벤치 명단 추가 */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-customBorder-light dark:border-customBorder-dark pb-1">
                    <h3 className="text-xs font-bold">벤치/교체 선수 등록</h3>
                    <button
                      onClick={() => setSubstitutes([...substitutes, { userId: "", position: "SUB" }])}
                      className="text-[10px] text-primary-light font-bold flex items-center gap-0.5 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> 추가
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {substitutes.map((sub, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={sub.userId}
                          onChange={(e) => {
                            const updated = [...substitutes];
                            updated[idx].userId = e.target.value;
                            setSubstitutes(updated);
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-muted/40 border border-customBorder-light dark:border-customBorder-dark rounded-xl focus:outline-none"
                        >
                          <option value="">선수 선택</option>
                          {actualAttendedMembers.map((m: any) => (
                            <option key={m.userId} value={m.userId}>
                              #{m.jerseyNumber ?? "-"} {m.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            setSubstitutes(substitutes.filter((_, sIdx) => sIdx !== idx));
                          }}
                          className="p-1 hover:bg-muted text-red-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            <div className="pt-4 border-t border-customBorder-light dark:border-customBorder-dark flex gap-3">
              <button
                onClick={() => setIsLineupModalOpen(false)}
                className="w-full py-2 bg-muted hover:bg-muted/80 text-xs font-bold rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleLineupSubmit}
                className="w-full py-2 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white text-xs font-bold rounded-xl shadow-md"
              >
                라인업 등록 저장
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
