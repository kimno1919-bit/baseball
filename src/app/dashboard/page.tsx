"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  Trophy, 
  Target, 
  Activity, 
  Users, 
  ArrowRight, 
  AlertCircle,
  PlusCircle,
  UserCheck
} from "lucide-react";
import { formatRate, formatDecimal } from "@/lib/stats";

// Recharts 래퍼 컴포넌트 dynamic import
const DashboardChart = dynamic(
  () => import("@/components/DashboardChart"),
  { ssr: false }
);

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. 가용한 시즌 목록 로드
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
        console.error("시즌 로드 에러:", err);
      }
    }
    loadSeasons();
  }, []);

  // 2. 선택된 시즌의 통계 로드
  useEffect(() => {
    if (!selectedSeasonId) return;

    async function loadStats() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stats?seasonId=${selectedSeasonId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "통계 데이터를 가져오지 못했습니다.");
        } else {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        setError("서버와의 통신에 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [selectedSeasonId]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark"></div>
      </div>
    );
  }

  const hasGames = stats && stats.summary && stats.summary.totalGames > 0;
  const isTeacher = session?.user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 타이틀 & 시즌 드롭다운 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">클럽 대시보드</h1>
          <p className="text-xs text-muted-foreground">우리 클럽의 실시간 성적과 랭킹을 모아봅니다.</p>
        </div>

        {seasons.length > 0 && (
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? "(활성)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 2. 교사(ADMIN) 전용 빠른 바로가기 패널 */}
      {isTeacher && (
        <div className="p-4 bg-primary-light/5 border border-primary-light/20 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-primary-light/10 text-primary-light dark:text-primary-dark rounded-lg">
              <UserCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold">교사용 관리 메뉴 단축키:</span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/mypage?section=members"
              className="px-3 py-1.5 bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark text-xs rounded-lg font-medium hover:bg-muted transition-colors"
            >
              부원 및 가입 관리
            </Link>
            <Link
              href="/games?register=true"
              className="px-3 py-1.5 bg-primary-light dark:bg-primary-dark text-white dark:text-customBg-dark text-xs rounded-lg font-bold hover:shadow-md transition-all flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              경기 등록
            </Link>
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-light/10 text-danger-light text-xs rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 빈 상태 (경기가 없을 때) */}
      {!hasGames && !error && (
        <div className="p-12 text-center border-2 border-dashed border-customBorder-light dark:border-customBorder-dark rounded-3xl space-y-4">
          <div className="text-4xl">⚾</div>
          <h3 className="text-lg font-semibold">이번 시즌 완료된 경기가 없습니다.</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            경기가 치러지고 교사가 기록을 최종 확정하면 이곳에 실시간 승패 통계와 선수 랭킹이 표시됩니다.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/games"
              className="px-4 py-2 bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark text-xs font-bold rounded-xl"
            >
              경기 일정 보러가기
            </Link>
          </div>
        </div>
      )}

      {/* 메인 통계 그리드 */}
      {hasGames && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* A. 기본 전적 카드 */}
          <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary-light dark:text-primary-dark" />
                시즌 전적
              </h2>
              <span className="text-xxs text-muted-foreground">확정 경기 기준</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-muted dark:bg-muted-foreground/10 p-4 rounded-2xl">
                <div className="text-xs text-muted-foreground">승률</div>
                <div className="text-2xl font-black text-primary-light dark:text-primary-dark">
                  {formatRate(stats.summary.wpct)}
                </div>
              </div>
              <div className="bg-muted dark:bg-muted-foreground/10 p-4 rounded-2xl col-span-2">
                <div className="text-xs text-muted-foreground">경기 성적</div>
                <div className="text-2xl font-black">
                  {stats.summary.wins}승 {stats.summary.draws}무 {stats.summary.losses}패
                </div>
                <div className="text-xxs text-muted-foreground">
                  (총 {stats.summary.totalGames}경기)
                </div>
              </div>
            </div>

            {/* 팀 세부 스탯 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="border-r border-customBorder-light dark:border-customBorder-dark pr-4">
                <span className="text-xxs text-muted-foreground block">팀 타율</span>
                <span className="text-sm font-extrabold">{formatRate(stats.summary.teamBatting.avg)}</span>
              </div>
              <div className="border-r border-customBorder-light dark:border-customBorder-dark pr-4 sm:pl-4">
                <span className="text-xxs text-muted-foreground block">팀 OPS</span>
                <span className="text-sm font-extrabold">{formatDecimal(stats.summary.teamBatting.ops, 3)}</span>
              </div>
              <div className="border-r border-customBorder-light dark:border-customBorder-dark sm:pl-4">
                <span className="text-xxs text-muted-foreground block">팀 평균자책점</span>
                <span className="text-sm font-extrabold">{formatDecimal(stats.summary.teamPitching.era)}</span>
              </div>
              <div className="sm:pl-4">
                <span className="text-xxs text-muted-foreground block">경기당 득/실점</span>
                <span className="text-sm font-extrabold text-success-light">
                  {formatDecimal(stats.summary.avgRuns, 1)} / {formatDecimal(stats.summary.avgRunsAllowed, 1)}
                </span>
              </div>
            </div>
          </div>

          {/* B. 최근 경기 결과 목록 */}
          <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-secondary-light dark:text-secondary-dark" />
                최근 경기 결과
              </h2>
              <Link href="/games" className="text-[10px] text-primary-light dark:text-primary-dark flex items-center gap-0.5 hover:underline">
                더보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {stats.recentGames.map((game: any) => (
                <Link
                  href={`/games/${game.gameId}`}
                  key={game.gameId}
                  className="flex items-center justify-between p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold">vs {game.opponent}</span>
                    <span className="text-[10px] text-muted-foreground block">{game.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold">
                      {game.ourScore} : {game.opponentScore}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 font-bold rounded-md ${
                      game.result === "WIN"
                        ? "bg-success-light/10 text-success-light border border-success-light/20"
                        : game.result === "LOSS"
                        ? "bg-danger-light/10 text-danger-light border border-danger-light/20"
                        : "bg-muted-foreground/10 text-muted-foreground border border-muted-foreground/20"
                    }`}>
                      {game.result === "WIN" ? "승" : game.result === "LOSS" ? "패" : "무"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* C. 득실점 추세 차트 */}
          <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              최근 5경기 득실점 추세
            </h2>
            <div className="h-64 w-full">
              <DashboardChart data={stats.recentGames} />
            </div>
          </div>

          {/* D. TOP 3 랭킹 카드 */}
          <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              부문별 TOP 3 선수
            </h2>

            <div className="space-y-4">
              {/* 타율 부문 */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block border-b border-customBorder-light dark:border-customBorder-dark pb-0.5">
                  🔥 타율 (최소 3타수)
                </span>
                {stats.rankings.avg.length === 0 ? (
                  <span className="text-xxs text-muted-foreground block">대상자 없음</span>
                ) : (
                  stats.rankings.avg.map((player: any, idx: number) => (
                    <div key={player.id} className="flex justify-between items-center text-xs">
                      <span>{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                      <span className="font-extrabold text-primary-light dark:text-primary-dark">{formatRate(player.avg)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 방어율 부문 */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block border-b border-customBorder-light dark:border-customBorder-dark pb-0.5">
                  ⚾ 방어율 (최소 2이닝)
                </span>
                {stats.rankings.era.length === 0 ? (
                  <span className="text-xxs text-muted-foreground block">대상자 없음</span>
                ) : (
                  stats.rankings.era.map((player: any, idx: number) => (
                    <div key={player.id} className="flex justify-between items-center text-xs">
                      <span>{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                      <span className="font-extrabold text-danger-light dark:text-danger-dark">{formatDecimal(player.era)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 홈런 부문 */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground block border-b border-customBorder-light dark:border-customBorder-dark pb-0.5">
                  🚀 홈런
                </span>
                {stats.rankings.homeRuns.length === 0 ? (
                  <span className="text-xxs text-muted-foreground block">대상자 없음</span>
                ) : (
                  stats.rankings.homeRuns.map((player: any, idx: number) => (
                    <div key={player.id} className="flex justify-between items-center text-xs">
                      <span>{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                      <span className="font-extrabold text-success-light">{player.hr}개</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
