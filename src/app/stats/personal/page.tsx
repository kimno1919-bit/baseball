"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { TrendingUp, AlertCircle, Award } from "lucide-react";
import { formatRate, formatDecimal } from "@/lib/stats";

const StatsChart = dynamic(() => import("@/components/StatsChart"), { ssr: false });

export default function PersonalStatsPage() {
  const { data: session } = useSession();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [playerList, setPlayerList] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        if (session?.user?.id && data.playerStats) {
          const found = data.playerStats.find((p: any) => p.id === session.user.id);
          if (found) setSelectedPlayerId(session.user.id);
          else if (data.playerStats.length > 0) setSelectedPlayerId(data.playerStats[0].id);
        } else if (data.playerStats && data.playerStats.length > 0) {
          setSelectedPlayerId(data.playerStats[0].id);
        }
      } else {
        setError("데이터를 가져올 수 없습니다.");
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">개인 기록 대장</h1>
          <p className="text-xs text-muted-foreground">부원별 세부 야구 기록과 누적 통계를 조회합니다.</p>
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
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="px-3 py-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark rounded-xl text-sm focus:outline-none"
          >
            {playerList.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.jerseyNumber ?? "-"} {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-light/10 text-danger-light text-xs rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {playerStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-primary-light dark:text-primary-dark">
                #{playerStats.user.jerseyNumber ?? "-"} {playerStats.user.name}
              </h3>
              <span className="text-[10px] text-muted-foreground">주포지션: {playerStats.user.primaryPosition}</span>
            </div>

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
                    const originalBat = playerStats.user.battingRecords?.[idx]; 
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

      {teamStats && (
        <div className="pt-8">
          <h2 className="text-xl font-bold mb-6">시즌 타이틀 랭킹 (전체 경기 누적)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-yellow-500" /> 타율 (최소 3타수)
              </h3>
              <div className="space-y-2">
                {teamStats.rankings.avg.map((player: any, idx: number) => (
                  <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                    <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                    <span className="font-black text-primary-light">{formatRate(player.avg)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-red-500" /> 평균자책점 (최소 2이닝)
              </h3>
              <div className="space-y-2">
                {teamStats.rankings.era.map((player: any, idx: number) => (
                  <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                    <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                    <span className="font-black text-danger-light">{formatDecimal(player.era)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-success-light" /> 홈런
              </h3>
              <div className="space-y-2">
                {teamStats.rankings.homeRuns.map((player: any, idx: number) => (
                  <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                    <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                    <span className="font-black text-success-light">{player.hr}개</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-500" /> 탈삼진
              </h3>
              <div className="space-y-2">
                {teamStats.rankings.strikeouts.map((player: any, idx: number) => (
                  <div key={player.id} className="flex justify-between items-center p-3 bg-muted dark:bg-muted-foreground/10 rounded-xl text-xs">
                    <span className="font-bold">{idx + 1}위. #{player.jerseyNumber} {player.name}</span>
                    <span className="font-black text-indigo-500">{player.k}개</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
