"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Trophy, 
  BarChart3, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { formatRate, formatDecimal } from "@/lib/stats";

export default function TeamStatsPage() {
  const { data: session } = useSession();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
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

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark"></div>
      </div>
    );
  }

  const renderSummaryCard = (title: string, summary: any) => {
    if (!summary || summary.totalGames === 0) {
      return (
        <div className="p-8 text-center border-2 border-dashed border-customBorder-light dark:border-customBorder-dark rounded-3xl text-sm text-muted-foreground mb-6">
          {title} 데이터가 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-6 mb-12">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary-light dark:text-primary-dark" />
              팀 전적 분석
            </h3>
            <div className="text-center bg-muted dark:bg-muted-foreground/10 p-5 rounded-2xl">
              <span className="text-[10px] text-muted-foreground block">승률</span>
              <span className="text-3xl font-black text-primary-light dark:text-primary-dark">
                {formatRate(summary.wpct)}
              </span>
              <p className="text-xs font-semibold mt-1">
                {summary.wins}승 {summary.draws}무 {summary.losses}패 (총 {summary.totalGames}경기)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center text-xs">
              <div className="p-2 border border-customBorder-light dark:border-customBorder-dark rounded-xl">
                <span className="text-xxs text-muted-foreground block">경기당 평균 득점</span>
                <span className="font-extrabold text-success-light">{formatDecimal(summary.avgRuns, 1)}</span>
              </div>
              <div className="p-2 border border-customBorder-light dark:border-customBorder-dark rounded-xl">
                <span className="text-xxs text-muted-foreground block">경기당 평균 실점</span>
                <span className="font-extrabold text-danger-light">{formatDecimal(summary.avgRunsAllowed, 1)}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold border-b border-customBorder-light dark:border-customBorder-dark pb-1.5 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                팀 종합 타격 지표
              </h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                  <span className="text-xxs text-muted-foreground block">팀 타율 (AVG)</span>
                  <span className="text-sm font-extrabold">{formatRate(summary.teamBatting.avg)}</span>
                </div>
                <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                  <span className="text-xxs text-muted-foreground block">팀 출루율 (OBP)</span>
                  <span className="text-sm font-extrabold">{formatRate(summary.teamBatting.obp)}</span>
                </div>
                <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                  <span className="text-xxs text-muted-foreground block">팀 장타율 (SLG)</span>
                  <span className="text-sm font-extrabold">{formatRate(summary.teamBatting.slg)}</span>
                </div>
                <div className="p-3 bg-primary-light/5 border border-primary-light/15 rounded-2xl">
                  <span className="text-xxs text-muted-foreground block">팀 OPS</span>
                  <span className="text-sm font-extrabold text-primary-light dark:text-primary-dark">
                    {formatDecimal(summary.teamBatting.ops, 3)}
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
                  <span className="text-sm font-extrabold">{summary.teamPitching.inningsPitched}</span>
                </div>
                <div className="p-3 bg-muted dark:bg-muted-foreground/10 rounded-2xl">
                  <span className="text-xxs text-muted-foreground block">팀 방어율 (ERA)</span>
                  <span className="text-sm font-extrabold text-danger-light">{formatDecimal(summary.teamPitching.era)}</span>
                </div>
                <div className="p-3 bg-primary-light/5 border border-primary-light/15 rounded-2xl">
                  <span className="text-xxs text-muted-foreground block">팀 WHIP</span>
                  <span className="text-sm font-extrabold text-primary-light dark:text-primary-dark">
                    {formatDecimal(summary.teamPitching.whip)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">팀 기록 대장</h1>
          <p className="text-xs text-muted-foreground">대회 기록과 연습 경기 기록을 분리하여 팀 전적을 분석합니다.</p>
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

      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-light/10 text-danger-light text-xs rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {teamStats && (
        <>
          {renderSummaryCard("🏆 대회/리그 경기 (LEAGUE & TOURNAMENT)", teamStats.officialSummary)}
          <hr className="border-customBorder-light dark:border-customBorder-dark" />
          {renderSummaryCard("🧢 연습/친선 경기 (PRACTICE & FRIENDLY)", teamStats.practiceSummary)}
          <hr className="border-customBorder-light dark:border-customBorder-dark" />
          {renderSummaryCard("📊 전체 종합 기록 (TOTAL)", teamStats.summary)}
        </>
      )}
    </div>
  );
}
