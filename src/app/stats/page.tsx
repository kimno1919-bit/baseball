"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { 
  Trophy, 
  Users, 
  BarChart3, 
  TrendingUp,
  Award,
  AlertCircle
} from "lucide-react";
import { formatRate, formatDecimal } from "@/lib/stats";

// Recharts 래퍼 컴포넌트 dynamic import
const StatsChart = dynamic(
  () => import("@/components/StatsChart"),
  { ssr: false }
);

export default function StatsPage() {
  const { data: session } = useSession();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [activeTab, setActiveTab] = useState<"team" | "player" | "ranking">("team");
  
  // 데이터 상태
  const [teamStats, setTeamStats] = useState<any>(null);
  const [playerList, setPlayerList] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // 2. 팀 종합 통계 & 선수 목록 로드
  const loadTeamStats = async () => {
    if (!selectedSeasonId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stats?seasonId=${selectedSeasonId}`);
      if (res.ok) {
        const data = await res.json();
        setTeamStats(data);
        setPlayerList(data.playerStats || []);
        
        // 로그인한 유저를 기본 선택 플레이어로 세팅
        if (session?.user?.id && data.playerStats) {
          const found = data.playerStats.find((p: any) => p.id === session.user.id);
          if (found) setSelectedPlayerId(session.user.id);
          else if (data.playerStats.length > 0) setSelectedPlayerId(data.playerStats[0].id);
        } else if (data.playerStats && data.playerStats.length > 0) {
          setSelectedPlayerId(data.playerStats[0].id);
        }
      } else {
        setError("통계 데이터를 가져올 수 없습니다.");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeamStats();
  }, [selectedSeasonId]);

  // 3. 개별 선수 세부 통계 로드
  useEffect(() => {
    if (!selectedSeasonId || !selectedPlayerId) return;

    async function loadPlayerDetail() {
      try {
        const res = await fetch(`/api/stats?seasonId=${selectedSeasonId}&userId=${selectedPlayerId}`);
        if (res.ok) {
          const data = await res.json();
          setPlayerStats(data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadPlayerDetail();
  }, [selectedSeasonId, selectedPlayerId]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark"></div>
      </div>
    );
  }

  const hasGames = teamStats && teamStats.summary && teamStats.summary.totalGames > 0;

  return (
    <div className="space-y-6">
      
      {/* 1. 상단 타이틀 & 시즌 셀렉터 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">시즌 성적 대장</h1>
          <p className="text-xs text-muted-foreground">우리 팀의 전적 분석과 부원별 세부 야구 기록을 조회합니다.</p>
        </div>

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
      </div>

      {/* 2. 탭 전환 */}
      <div className="flex border-b border-customBorder-light dark:border-customBorder-dark">
        {[
          { id: "team", name: "팀 종합 전적" },
          { id: "player", name: "부원별 기록 대장" },
          { id: "ranking", name: "시즌 타이틀 랭킹" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-primary-light text-primary-light dark:border-primary-dark dark:text-primary-dark font-extrabold"
                : "border-transparent text-muted-foreground hover:text-customText-light"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 에러 상태 */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-light/10 text-danger-light text-xs rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 빈 화면 */}
      {!hasGames && !error && (
        <div className="p-12 text-center border-2 border-dashed border-customBorder-light dark:border-customBorder-dark rounded-3xl text-sm text-muted-foreground">
          선택된 시즌에 완료된 경기가 없어 통계가 아직 집계되지 않았습니다.
        </div>
      )}

      {/* 3. 탭 상세 콘텐츠 */}
      {hasGames && teamStats && (
        <div className="space-y-6">
          
          {/* A. 팀 종합 전적 탭 */}
          {activeTab === "team" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 전적 카드 */}
              <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary-light dark:text-primary-dark" />
                  팀 전적 분석
                </h3>
                <div className="text-center bg-muted dark:bg-muted-foreground/10 p-5 rounded-2xl">
                  <span className="text-[10px] text-muted-foreground block">승률</span>
                  <span className="text-3xl font-black text-primary-light dark:text-primary-dark">
                    {formatRate(teamStats.summary.wpct)}
                  </span>
                  <p className="text-xs font-semibold mt-1">
                    {teamStats.summary.wins}승 {teamStats.summary.draws}무 {teamStats.summary.losses}패 (총 {teamStats.summary.totalGames}경기)
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center text-xs">
                  <div className="p-2 border border-customBorder-light dark:border-customBorder-dark rounded-xl">
                    <span className="text-xxs text-muted-foreground block">경기당 평균 득점</span>
                    <span className="font-extrabold text-success-light">{formatDecimal(teamStats.summary.avgRuns, 1)}</span>
                  </div>
                  <div className="p-2 border border-customBorder-light dark:border-customBorder-dark rounded-xl">
                    <span className="text-xxs text-muted-foreground block">경기당 평균 실점</span>
                    <span className="font-extrabold text-danger-light">{formatDecimal(teamStats.summary.avgRunsAllowed, 1)}</span>
                  </div>
                </div>
              </div>

              {/* 팀 타격/투구 통합 스탯 테이블 */}
              <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1.5 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    팀 종합 타격 지표
                  </h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                      <span className="text-xxs text-muted-foreground block">팀 타율 (AVG)</span>
                      <span className="text-sm font-extrabold">{formatRate(teamStats.summary.teamBatting.avg)}</span>
                    </div>
                    <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                      <span className="text-xxs text-muted-foreground block">팀 출루율 (OBP)</span>
                      <span className="text-sm font-extrabold">{formatRate(teamStats.summary.teamBatting.obp)}</span>
                    </div>
                    <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                      <span className="text-xxs text-muted-foreground block">팀 장타율 (SLG)</span>
                      <span className="text-sm font-extrabold">{formatRate(teamStats.summary.teamBatting.slg)}</span>
                    </div>
                    <div className="p-3 bg-primary-light/5 border border-primary-light/15 rounded-2xl">
                      <span className="text-xxs text-muted-foreground block">팀 OPS</span>
                      <span className="text-sm font-extrabold text-primary-light dark:text-primary-dark">
                        {formatDecimal(teamStats.summary.teamBatting.ops, 3)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1.5 flex items-center gap-1">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    팀 종합 투구 지표
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                      <span className="text-xxs text-muted-foreground block">팀 이닝 (IP)</span>
                      <span className="text-sm font-extrabold">{teamStats.summary.teamPitching.inningsPitched}</span>
                    </div>
                    <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                      <span className="text-xxs text-muted-foreground block">팀 방어율 (ERA)</span>
                      <span className="text-sm font-extrabold text-danger-light">{formatDecimal(teamStats.summary.teamPitching.era)}</span>
                    </div>
                    <div className="p-3 bg-primary-light/5 border border-primary-light/15 rounded-2xl">
                      <span className="text-xxs text-muted-foreground block">팀 WHIP</span>
                      <span className="text-sm font-extrabold text-primary-light dark:text-primary-dark">
                        {formatDecimal(teamStats.summary.teamPitching.whip)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. 부원별 기록 대장 탭 */}
          {activeTab === "player" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">부원 선택:</span>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="px-3 py-1.5 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-xl text-xs focus:outline-none"
                  >
                    {playerList.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.jerseyNumber ?? "-"} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {playerStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* 개인 누적 요약 */}
                  <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-primary-light dark:text-primary-dark">
                        #{playerStats.user.jerseyNumber ?? "-"} {playerStats.user.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">주포지션: {playerStats.user.primaryPosition}</span>
                    </div>

                    {/* 타격 누적 */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground block border-b border-customBorder-light dark:border-customBorder-dark pb-0.5">타격 시즌 누계</span>
                      <div className="grid grid-cols-2 gap-2.5 text-xs text-center">
                        <div className="p-2 bg-muted dark:bg-muted-foreground/10 rounded-xl">
                          <span className="text-xxs text-muted-foreground block">타율</span>
                          <span className="font-extrabold">{formatRate(playerStats.batting.avg)}</span>
                        </div>
                        <div className="p-2 bg-muted dark:bg-muted-foreground/10 rounded-xl">
                          <span className="text-xxs text-muted-foreground block">OPS</span>
                          <span className="font-extrabold">{formatDecimal(playerStats.batting.ops, 3)}</span>
                        </div>
                      </div>
                      <div className="text-[10px] space-y-1 text-muted-foreground">
                        <div className="flex justify-between"><span>출전 경기수</span><span className="font-semibold text-customText-light dark:text-customText-dark">{playerStats.batting.games}경기</span></div>
                        <div className="flex justify-between"><span>타석 / 타수</span><span className="font-semibold text-customText-light dark:text-customText-dark">{playerStats.batting.plateAppearances} / {playerStats.batting.atBats}</span></div>
                        <div className="flex justify-between"><span>안타 / 홈런</span><span className="font-semibold text-customText-light dark:text-customText-dark">{playerStats.batting.hits} / {playerStats.batting.homeRuns}</span></div>
                        <div className="flex justify-between"><span>타점 / 득점</span><span className="font-semibold text-customText-light dark:text-customText-dark">{playerStats.batting.rbis} / {playerStats.batting.runs}</span></div>
                      </div>
                    </div>

                    {/* 투구 누적 (투구 이닝이 있을 때만 노출) */}
                    {playerStats.pitching.games > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-bold text-muted-foreground block border-b border-customBorder-light dark:border-customBorder-dark pb-0.5">투구 시즌 누계</span>
                        <div className="grid grid-cols-2 gap-2.5 text-xs text-center">
                          <div className="p-2 bg-muted dark:bg-muted-foreground/10 rounded-xl">
                            <span className="text-xxs text-muted-foreground block">평균자책점</span>
                            <span className="font-extrabold text-danger-light">{formatDecimal(playerStats.pitching.era)}</span>
                          </div>
                          <div className="p-2 bg-muted dark:bg-muted-foreground/10 rounded-xl">
                            <span className="text-xxs text-muted-foreground block">이닝 (IP)</span>
                            <span className="font-extrabold">{playerStats.pitching.inningsPitched}</span>
                          </div>
                        </div>
                        <div className="text-[10px] space-y-1 text-muted-foreground">
                          <div className="flex justify-between"><span>승 / 패 / 세</span><span className="font-semibold text-customText-light dark:text-customText-dark">{playerStats.pitching.wins}승 {playerStats.pitching.losses}패 {playerStats.pitching.saves}세</span></div>
                          <div className="flex justify-between"><span>탈삼진 (K)</span><span className="font-semibold text-customText-light dark:text-customText-dark">{playerStats.pitching.strikeouts}개</span></div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* 개인 누적 타율 변화 추이 차트 */}
                  <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
                    <h3 className="text-xs font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-primary-light" />
                      시즌 경기별 누적 타율 추이
                    </h3>
                    
                    {playerStats.batting.trend.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                        타격 추세를 그리기 위한 경기 참여 기록이 없습니다.
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <StatsChart data={playerStats.batting.trend} />
                      </div>
                    )}
                  </div>

                  {/* 개인 경기별 성적 표 */}
                  <div className="md:col-span-3 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-3">
                    <h3 className="text-xs font-bold">참여 경기별 상세 지표</h3>
                    <div className="overflow-x-auto border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
                      <table className="w-full text-center text-xs whitespace-nowrap">
                        <thead>
                          <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                            <th className="p-3 text-left">경기일 / 상대팀</th>
                            <th className="p-3">타석</th>
                            <th className="p-3">타수</th>
                            <th className="p-3">안타</th>
                            <th className="p-3">홈런</th>
                            <th className="p-3">타점</th>
                            <th className="p-3">득점</th>
                            <th className="p-3">볼넷</th>
                            <th className="p-3">삼진</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerStats.batting.trend.map((record: any, idx: number) => {
                            const originRecord = playerStats.batting.trend[idx];
                            const originalBat = playerStats.user.battingRecords?.[idx]; // 원본 스탯 매핑 
                            
                            return (
                              <tr key={idx} className="border-b border-customBorder-light dark:border-customBorder-dark last:border-0">
                                <td className="p-3 text-left font-bold">{record.gameDate} vs {record.opponent}</td>
                                <td className="p-3">{record.atBats + (originalBat?.walks || 0)}</td>
                                <td className="p-3">{record.atBats}</td>
                                <td className="p-3 font-semibold text-primary-light">{record.hits}</td>
                                <td className="p-3">{originalBat?.homeRuns || 0}</td>
                                <td className="p-3">{originalBat?.rbis || 0}</td>
                                <td className="p-3">{originalBat?.runs || 0}</td>
                                <td className="p-3">{originalBat?.walks || 0}</td>
                                <td className="p-3">{originalBat?.strikeouts || 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* C. 시즌 타이틀 랭킹 탭 */}
          {activeTab === "ranking" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. 타율 부문 */}
              <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-yellow-500" />
                  타율 부문 (AVG) - 최소 3타수
                </h3>
                <div className="space-y-2">
                  {teamStats.rankings.avg.length === 0 ? (
                    <span className="text-xs text-muted-foreground block text-center py-4">대상자 없음</span>
                  ) : (
                    teamStats.rankings.avg.map((player: any, idx: number) => (
                      <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                        <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                        <span className="font-black text-primary-light dark:text-primary-dark">{formatRate(player.avg)} ({player.h}안타 / {player.ab}타수)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. 평균자책점 부문 */}
              <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-red-500" />
                  평균자책점 부문 (ERA) - 최소 2이닝
                </h3>
                <div className="space-y-2">
                  {teamStats.rankings.era.length === 0 ? (
                    <span className="text-xs text-muted-foreground block text-center py-4">대상자 없음</span>
                  ) : (
                    teamStats.rankings.era.map((player: any, idx: number) => (
                      <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                        <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                        <span className="font-black text-danger-light dark:text-danger-dark">{formatDecimal(player.era)} ({player.ip}이닝)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. 홈런 부문 */}
              <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-success-light" />
                  홈런 부문 (HR)
                </h3>
                <div className="space-y-2">
                  {teamStats.rankings.homeRuns.length === 0 ? (
                    <span className="text-xs text-muted-foreground block text-center py-4">대상자 없음</span>
                  ) : (
                    teamStats.rankings.homeRuns.map((player: any, idx: number) => (
                      <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                        <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                        <span className="font-black text-success-light">{player.hr}개 ({player.ab}타수)</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. 탈삼진 부문 */}
              <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-500" />
                  탈삼진 부문 (K)
                </h3>
                <div className="space-y-2">
                  {teamStats.rankings.strikeouts.length === 0 ? (
                    <span className="text-xs text-muted-foreground block text-center py-4">대상자 없음</span>
                  ) : (
                    teamStats.rankings.strikeouts.map((player: any, idx: number) => (
                      <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                        <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                        <span className="font-black text-indigo-500">{player.k}개</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
