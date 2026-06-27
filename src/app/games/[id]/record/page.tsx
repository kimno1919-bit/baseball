"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Save, 
  Check, 
  AlertCircle,
  Plus, 
  Trash2, 
  HelpCircle,
  Info
} from "lucide-react";
import { 
  calculateAvg, 
  calculateObp, 
  calculateSlg, 
  calculateOps, 
  calculateEra, 
  calculateWhip,
  formatRate, 
  formatDecimal 
} from "@/lib/stats";

export default function GameRecordPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const gameId = params.id;

  const [game, setGame] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"score" | "batting" | "pitching">("score");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. 스코어 상태
  const [inningScores, setInningScores] = useState<any[]>([]); // [{ inning: 1, our: number, opp: number }]

  // 2. 타격 상태 (라인업 선수 매핑)
  const [battingRecords, setBattingRecords] = useState<any[]>([]);

  // 3. 투구 상태
  const [pitchingRecords, setPitchingRecords] = useState<any[]>([]);
  const [actualAttendedUsers, setActualAttendedUsers] = useState<any[]>([]); // 투수 추가 드롭다운용

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  // 데이터 조회
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data);

        // 스코어 바인딩
        let scores = [];
        try {
          scores = JSON.parse(data.inningScores || "[]");
        } catch (e) {
          console.error(e);
        }
        // 기본 7이닝 세팅 보장
        if (scores.length === 0) {
          const defaultInnings = data.season?.inningsPerGame || 7;
          scores = Array.from({ length: defaultInnings }, (_, i) => ({
            inning: i + 1,
            our: 0,
            opp: 0,
          }));
        }
        setInningScores(scores);

        // 타격 기록 바인딩: 라인업 선수 목록 기준
        // 라인업에 등록된 모든 선수들을 가져온다
        const linePlayers = data.lineups || [];
        const existingBatMap = new Map<string, any>(data.battingRecords.map((b: any) => [b.userId, b]));

        const initializedBat = linePlayers.map((lp: any) => {
          const exist = existingBatMap.get(lp.userId);
          return {
            userId: lp.userId,
            name: lp.user.name,
            jerseyNumber: lp.user.jerseyNumber,
            battingOrder: lp.battingOrder,
            plateAppearances: exist?.plateAppearances ?? 0,
            atBats: exist?.atBats ?? 0,
            hits: exist?.hits ?? 0,
            doubles: exist?.doubles ?? 0,
            triples: exist?.triples ?? 0,
            homeRuns: exist?.homeRuns ?? 0,
            runs: exist?.runs ?? 0,
            rbis: exist?.rbis ?? 0,
            walks: exist?.walks ?? 0,
            strikeouts: exist?.strikeouts ?? 0,
            stolenBases: exist?.stolenBases ?? 0,
            hitByPitch: exist?.hitByPitch ?? 0,
            sacrifice: exist?.sacrifice ?? 0,
          };
        });
        setBattingRecords(initializedBat);

        // 투구 기록 바인딩
        const existingPitch = data.pitchingRecords || [];
        const initializedPitch = existingPitch.map((p: any) => ({
          userId: p.userId,
          name: p.user.name,
          jerseyNumber: p.user.jerseyNumber,
          inningsPitched: p.inningsPitched ?? 0.0,
          hitsAllowed: p.hitsAllowed ?? 0,
          runsAllowed: p.runsAllowed ?? 0,
          earnedRuns: p.earnedRuns ?? 0,
          walksAllowed: p.walksAllowed ?? 0,
          strikeouts: p.strikeouts ?? 0,
          homeRunsAllowed: p.homeRunsAllowed ?? 0,
          pitchCount: p.pitchCount ?? 0,
          decision: p.decision ?? "NONE",
        }));

        // 만약 투구 기록이 아예 비어있고 선발투수가 있다면, 선발투수를 기본 투수로 추가
        if (initializedPitch.length === 0) {
          const startingPitcher = linePlayers.find((l: any) => l.isStartingPitcher);
          if (startingPitcher) {
            initializedPitch.push({
              userId: startingPitcher.userId,
              name: startingPitcher.user.name,
              jerseyNumber: startingPitcher.user.jerseyNumber,
              inningsPitched: 0.0,
              hitsAllowed: 0,
              runsAllowed: 0,
              earnedRuns: 0,
              walksAllowed: 0,
              strikeouts: 0,
              homeRunsAllowed: 0,
              pitchCount: 0,
              decision: "NONE",
            });
          }
        }
        setPitchingRecords(initializedPitch);

        // 출석한 부원 목록 로드
        const attended = data.attendances.filter((a: any) => a.actualAttended).map((a: any) => a.user);
        setActualAttendedUsers(attended);

      } else {
        setError("경기 세부 정보를 가져올 수 없습니다.");
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [gameId]);

  // 5분 자동 임시저장 설정 (PRD 7-4)
  useEffect(() => {
    if (!game || game.status === "CONFIRMED") return; // 확정 경기 패스

    autoSaveTimerRef.current = setInterval(() => {
      handleSave("SAVE", true);
    }, 5 * 60 * 1000); // 5분

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [game, inningScores, battingRecords, pitchingRecords]);

  // 기록 전송 핸들러
  const handleSave = async (actionType: "SAVE" | "CONFIRM", isSilent: boolean = false) => {
    // 최종 확정 시 유효성 검증
    if (actionType === "CONFIRM") {
      // 1. 타자 검증
      for (const bat of battingRecords) {
        const h = bat.hits;
        const d = bat.doubles;
        const t = bat.triples;
        const hr = bat.homeRuns;
        const ab = bat.atBats;
        const pa = bat.plateAppearances;

        if (h < (d + t + hr)) {
          alert(`${bat.name} 부원의 안타 수(${h})가 2루타+3루타+홈런 합계(${d+t+hr})보다 작습니다.`);
          return;
        }
        if (pa < ab) {
          alert(`${bat.name} 부원의 타수(${ab})가 타석(${pa})보다 클 수 없습니다.`);
          return;
        }
      }

      // 2. 투수 검증
      let winCount = 0;
      let lossCount = 0;
      let saveCount = 0;

      for (const pitch of pitchingRecords) {
        const ip = pitch.inningsPitched;
        const decPart = Math.round((ip - Math.floor(ip)) * 10);
        if (decPart < 0 || decPart > 2) {
          alert(`${pitch.name} 투수의 이닝 소수점 첫째자리(.${decPart})가 유효하지 않습니다. 아웃카운트(.0, .1, .2) 중 지정해주세요.`);
          return;
        }

        if (pitch.decision === "WIN") winCount++;
        if (pitch.decision === "LOSS") lossCount++;
        if (pitch.decision === "SAVE") saveCount++;
      }

      const ourTotal = inningScores.reduce((sum, item) => sum + parseInt(item.our || 0), 0);
      const oppTotal = inningScores.reduce((sum, item) => sum + parseInt(item.opp || 0), 0);
      const isWin = ourTotal > oppTotal;
      const isLoss = ourTotal < oppTotal;

      if (isWin) {
        if (winCount !== 1) {
          alert("승리한 경기이므로 반드시 1명의 승리투수(WIN)를 지정해야 합니다.");
          return;
        }
        if (lossCount !== 0) {
          alert("승리한 경기에는 패전투수를 지정할 수 없습니다.");
          return;
        }
      } else if (isLoss) {
        if (lossCount !== 1) {
          alert("패배한 경기이므로 반드시 1명의 패전투수(LOSS)를 지정해야 합니다.");
          return;
        }
        if (winCount !== 0) {
          alert("패배한 경기에는 승리투수를 지정할 수 없습니다.");
          return;
        }
      } else {
        // 무승부
        if (winCount !== 0 || lossCount !== 0) {
          alert("무승부 경기에는 승리/패전 투수를 지정할 수 없습니다.");
          return;
        }
      }

      if (saveCount > 1) {
        alert("한 경기에 세이브 투수(SAVE)는 최대 1명만 지정 가능합니다.");
        return;
      }

      if (!confirm("정말로 이 기록을 최종 확정하시겠습니까? 확정 시 즉시 시즌 통계에 누적 집계됩니다.")) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/games/${gameId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          score: { inningScores },
          battingRecords,
          pitchingRecords,
        }),
      });

      if (res.ok) {
        if (!isSilent) {
          alert(actionType === "CONFIRM" ? "경기 기록이 최종 확정되었습니다!" : "임시저장이 완료되었습니다.");
          if (actionType === "CONFIRM") {
            router.push(`/games/${gameId}`);
          }
        }
      } else {
        const data = await res.json();
        if (!isSilent) alert(data.error || "기록 저장 에러");
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) alert("네트워크 서버 연결 오류");
    }
  };

  if (!isStaff) {
    return (
      <div className="p-8 text-center text-danger-light">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-semibold">경기 기록 입력 권한이 없습니다. 교사 또는 매니저만 접근할 수 있습니다.</p>
        <Link href={`/games/${gameId}`} className="text-xs text-primary-light hover:underline mt-4 inline-block">
          경기 상세 페이지로 돌아가기
        </Link>
      </div>
    );
  }

  if (isLoading || !game) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-light dark:border-primary-dark"></div>
      </div>
    );
  }

  // 스코어 합계 계산
  const ourTotalScore = inningScores.reduce((sum, item) => sum + parseInt(item.our || 0), 0);
  const oppTotalScore = inningScores.reduce((sum, item) => sum + parseInt(item.opp || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. 상단 경로 네비게이션 & 액션 패널 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link href={`/games/${gameId}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-customText-light">
          <ChevronLeft className="w-4 h-4" />
          경기 상세페이지로
        </Link>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleSave("SAVE")}
            className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark text-xs font-bold rounded-xl hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            임시저장
          </button>
          <button
            onClick={() => handleSave("CONFIRM")}
            className="flex-1 sm:flex-none px-4 py-2 bg-primary-light hover:bg-primary-light/95 dark:bg-primary-dark dark:text-customBg-dark text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            최종 확정
          </button>
        </div>
      </div>

      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">경기 기록 대장 입력</h1>
        <p className="text-xs text-muted-foreground">vs {game.opponentName} 경기 결과와 개인별 세부 스탯 대장을 편집합니다.</p>
      </div>

      {/* 2. 탭 전환 */}
      <div className="flex border-b border-customBorder-light dark:border-customBorder-dark">
        {[
          { id: "score", name: "1. 이닝 스코어" },
          { id: "batting", name: "2. 타자별 기록 대장" },
          { id: "pitching", name: "3. 투수별 기록 대장" },
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

      {/* 3. 탭 상세 내용 */}
      <div className="bg-surface-light dark:bg-surface-dark border border-customBorder-light dark:border-customBorder-dark p-6 rounded-3xl shadow-sm min-h-[300px]">
        
        {/* 3-A. 이닝 스코어 탭 */}
        {activeTab === "score" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold">이닝별 스코어 등록</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextInning = inningScores.length + 1;
                    setInningScores([...inningScores, { inning: nextInning, our: 0, opp: 0 }]);
                  }}
                  className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-[10px] font-bold rounded-lg flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> 이닝 추가
                </button>
                {inningScores.length > 7 && (
                  <button
                    type="button"
                    onClick={() => {
                      setInningScores(inningScores.slice(0, -1));
                    }}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg flex items-center gap-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 이닝 축소
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-customBorder-light dark:border-customBorder-dark rounded-2xl">
              <table className="w-full text-center text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-muted dark:bg-muted-foreground/10 border-b border-customBorder-light dark:border-customBorder-dark">
                    <th className="p-3 text-left">팀</th>
                    {inningScores.map((score, idx) => (
                      <th key={idx} className="p-3 font-semibold">{score.inning}회</th>
                    ))}
                    <th className="p-3 font-black bg-muted/60 dark:bg-muted-foreground/20">R (합계)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-customBorder-light dark:border-customBorder-dark">
                    <td className="p-3 text-left font-bold">우리팀</td>
                    {inningScores.map((score, idx) => (
                      <td key={idx} className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={score.our}
                          onChange={(e) => {
                            const updated = [...inningScores];
                            updated[idx].our = parseInt(e.target.value || "0");
                            setInningScores(updated);
                          }}
                          className="w-12 px-1 py-1 text-center bg-muted/20 border border-customBorder-light dark:border-customBorder-dark rounded"
                        />
                      </td>
                    ))}
                    <td className="p-3 font-black text-primary-light dark:text-primary-dark bg-muted/30 dark:bg-muted-foreground/10">
                      {ourTotalScore}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-left font-bold">{game.opponentName}</td>
                    {inningScores.map((score, idx) => (
                      <td key={idx} className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={score.opp}
                          onChange={(e) => {
                            const updated = [...inningScores];
                            updated[idx].opp = parseInt(e.target.value || "0");
                            setInningScores(updated);
                          }}
                          className="w-12 px-1 py-1 text-center bg-muted/20 border border-customBorder-light dark:border-customBorder-dark rounded"
                        />
                      </td>
                    ))}
                    <td className="p-3 font-black text-danger-light bg-muted/30 dark:bg-muted-foreground/10">
                      {oppTotalScore}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-center p-4 bg-muted/20 rounded-2xl">
              <span className="text-xxs text-muted-foreground block mb-0.5">예상 결과</span>
              <span className="text-sm font-black">
                {ourTotalScore > oppTotalScore ? "우리팀 승리" : ourTotalScore < oppTotalScore ? "상대팀 승리" : "무승부"} ({ourTotalScore} : {oppTotalScore})
              </span>
            </div>
          </div>
        )}

        {/* 3-B. 타격기록 입력 탭 */}
        {activeTab === "batting" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold">라인업 타격 스탯 기입</h2>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Info className="w-3.5 h-3.5" /> 안타(H) &gt;= 2루타+3루타+홈런, 타수(AB) &lt;= 타석(PA) 준수
              </span>
            </div>

            <div className="space-y-4">
              {battingRecords.length === 0 ? (
                <div className="text-center text-xs py-8 text-muted-foreground">라인업 선수가 아직 등록되지 않았습니다.</div>
              ) : (
                battingRecords.map((player, idx) => {
                  // 실시간 개인 성적 계산
                  const avg = calculateAvg(player.hits, player.atBats);
                  const obp = calculateObp(player.hits, player.walks, player.hitByPitch, player.atBats, player.sacrifice);
                  const slg = calculateSlg(player.hits, player.doubles, player.triples, player.homeRuns, player.atBats);
                  const ops = calculateOps(obp, slg);

                  const h = player.hits;
                  const d = player.doubles;
                  const t = player.triples;
                  const hr = player.homeRuns;
                  const ab = player.atBats;
                  const pa = player.plateAppearances;

                  // 유효성 체크
                  const isHitErr = h < (d + t + hr);
                  const isAbErr = pa < ab;

                  return (
                    <div
                      key={player.userId}
                      className={`p-4 border rounded-2xl space-y-3 transition-colors ${
                        isHitErr || isAbErr
                          ? "bg-danger-light/5 border-danger-light/20"
                          : "bg-muted/10 border-customBorder-light dark:border-customBorder-dark"
                      }`}
                    >
                      <div className="flex justify-between items-center border-b border-customBorder-light dark:border-customBorder-dark pb-2">
                        <span className="text-xs font-bold text-primary-light dark:text-primary-dark">
                          {player.battingOrder}번. #{player.jerseyNumber ?? "-"} {player.name}
                        </span>
                        
                        <div className="flex gap-4 text-[10px]">
                          <div>타율: <span className="font-bold">{formatRate(avg)}</span></div>
                          <div>OPS: <span className="font-bold">{formatDecimal(ops, 3)}</span></div>
                        </div>
                      </div>

                      {/* 경고 문구 */}
                      {isHitErr && <p className="text-[10px] text-danger-light font-semibold">⚠️ 안타({h})가 2루타+3루타+홈런 합산({d+t+hr})보다 작을 수 없습니다.</p>}
                      {isAbErr && <p className="text-[10px] text-danger-light font-semibold">⚠️ 타수({ab})는 타석({pa})보다 클 수 없습니다.</p>}

                      {/* 14개 입력 필드 구성 (가독성을 위해 1열에 6개씩 배치) */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">타석 (PA)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.plateAppearances}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].plateAppearances = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">타수 (AB)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.atBats}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].atBats = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">안타 (H)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.hits}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].hits = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">홈런 (HR)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.homeRuns}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].homeRuns = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">득점 (R)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.runs}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].runs = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">타점 (RBI)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.rbis}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].rbis = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">볼넷 (BB)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.walks}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].walks = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">삼진 (SO)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.strikeouts}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].strikeouts = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">2루타</label>
                          <input
                            type="number"
                            min="0"
                            value={player.doubles}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].doubles = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">3루타</label>
                          <input
                            type="number"
                            min="0"
                            value={player.triples}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].triples = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">사구 (HBP)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.hitByPitch}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].hitByPitch = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">희생타 (SAC)</label>
                          <input
                            type="number"
                            min="0"
                            value={player.sacrifice}
                            onChange={(e) => {
                              const updated = [...battingRecords];
                              updated[idx].sacrifice = parseInt(e.target.value || "0");
                              setBattingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 3-C. 투수기록 입력 탭 */}
        {activeTab === "pitching" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-customBorder-light dark:border-customBorder-dark pb-2">
              <h2 className="text-xs font-bold">등판 투수 기록 대장</h2>
              
              <button
                type="button"
                onClick={() => {
                  setPitchingRecords([
                    ...pitchingRecords,
                    {
                      userId: "",
                      name: "",
                      inningsPitched: 0.0,
                      hitsAllowed: 0,
                      runsAllowed: 0,
                      earnedRuns: 0,
                      walksAllowed: 0,
                      strikeouts: 0,
                      homeRunsAllowed: 0,
                      pitchCount: 0,
                      decision: "NONE",
                    },
                  ]);
                }}
                className="px-2 py-1 bg-primary-light text-white dark:bg-primary-dark dark:text-customBg-dark text-[10px] font-bold rounded-lg flex items-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> 투수 추가
              </button>
            </div>

            <div className="space-y-4">
              {pitchingRecords.length === 0 ? (
                <div className="text-center text-xs py-8 text-muted-foreground">등록된 투수가 없습니다. 우측 상단에서 추가해주세요.</div>
              ) : (
                pitchingRecords.map((pitcher, idx) => {
                  const era = calculateEra(pitcher.earnedRuns, pitcher.inningsPitched, game.season?.inningsPerGame);
                  const whip = calculateWhip(pitcher.walksAllowed, pitcher.hitsAllowed, pitcher.inningsPitched);

                  const ip = pitcher.inningsPitched;
                  const decPart = Math.round((ip - Math.floor(ip)) * 10);
                  const isIpErr = decPart < 0 || decPart > 2;

                  return (
                    <div
                      key={idx}
                      className={`p-4 border rounded-2xl space-y-3 transition-colors ${
                        isIpErr
                          ? "bg-danger-light/5 border-danger-light/20"
                          : "bg-muted/10 border-customBorder-light dark:border-customBorder-dark"
                      }`}
                    >
                      <div className="flex justify-between items-center border-b border-customBorder-light dark:border-customBorder-dark pb-2">
                        {pitcher.userId ? (
                          <span className="text-xs font-bold">
                            #{pitcher.jerseyNumber ?? "-"} {pitcher.name}
                          </span>
                        ) : (
                          <select
                            value={pitcher.userId}
                            onChange={(e) => {
                              const selectedUser = actualAttendedUsers.find((u) => u.id === e.target.value);
                              if (selectedUser) {
                                const updated = [...pitchingRecords];
                                updated[idx].userId = selectedUser.id;
                                updated[idx].name = selectedUser.name;
                                updated[idx].jerseyNumber = selectedUser.jerseyNumber;
                                setPitchingRecords(updated);
                              }
                            }}
                            className="text-xs bg-white dark:bg-surface-dark border border-customBorder-light rounded px-2 py-1"
                          >
                            <option value="">등판 투수 선택 (출석자)</option>
                            {actualAttendedUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                #{u.jerseyNumber ?? "-"} {u.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <div className="flex gap-4 text-[10px]">
                          <div>방어율(ERA): <span className="font-bold">{formatDecimal(era)}</span></div>
                          <div>WHIP: <span className="font-bold">{formatDecimal(whip)}</span></div>
                        </div>
                      </div>

                      {/* 이닝 에러 안내 */}
                      {isIpErr && (
                        <p className="text-[10px] text-danger-light font-semibold">
                          ⚠️ 이닝의 소수 첫째자리는 아웃카운트(.0, .1, .2)만 가능합니다.
                        </p>
                      )}

                      {/* 투수 기입 폼 */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <label className="text-xxs text-muted-foreground">이닝 (IP)</label>
                            <span className="text-[10px] text-muted-foreground" title="예: 5.1 = 5이닝 1아웃, 5.2 = 5이닝 2아웃">❓</span>
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={pitcher.inningsPitched}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].inningsPitched = parseFloat(e.target.value || "0.0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">피안타</label>
                          <input
                            type="number"
                            min="0"
                            value={pitcher.hitsAllowed}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].hitsAllowed = parseInt(e.target.value || "0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">자책점 (ER)</label>
                          <input
                            type="number"
                            min="0"
                            value={pitcher.earnedRuns}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].earnedRuns = parseInt(e.target.value || "0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">볼넷 허용</label>
                          <input
                            type="number"
                            min="0"
                            value={pitcher.walksAllowed}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].walksAllowed = parseInt(e.target.value || "0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">탈삼진 (K)</label>
                          <input
                            type="number"
                            min="0"
                            value={pitcher.strikeouts}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].strikeouts = parseInt(e.target.value || "0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">실점 (R)</label>
                          <input
                            type="number"
                            min="0"
                            value={pitcher.runsAllowed}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].runsAllowed = parseInt(e.target.value || "0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">피홈런</label>
                          <input
                            type="number"
                            min="0"
                            value={pitcher.homeRunsAllowed}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].homeRunsAllowed = parseInt(e.target.value || "0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">투구수</label>
                          <input
                            type="number"
                            min="0"
                            value={pitcher.pitchCount}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].pitchCount = parseInt(e.target.value || "0");
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-2 py-1 bg-white dark:bg-surface-dark border rounded"
                          />
                        </div>

                        {/* 결정 (W/L/S/H) */}
                        <div className="space-y-0.5">
                          <label className="text-xxs text-muted-foreground">결정 (Decision)</label>
                          <select
                            value={pitcher.decision}
                            onChange={(e) => {
                              const updated = [...pitchingRecords];
                              updated[idx].decision = e.target.value;
                              setPitchingRecords(updated);
                            }}
                            className="w-full px-1.5 py-1 bg-white dark:bg-surface-dark border rounded"
                          >
                            <option value="NONE">-</option>
                            <option value="WIN">승리투수 (WIN)</option>
                            <option value="LOSS">패전투수 (LOSS)</option>
                            <option value="SAVE">세이브 (SAVE)</option>
                            <option value="HOLD">홀드 (HOLD)</option>
                          </select>
                        </div>

                        {/* 삭제 */}
                        <div className="flex items-end justify-center pb-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPitchingRecords(pitchingRecords.filter((_, pIdx) => pIdx !== idx));
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
