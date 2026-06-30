import { PrismaClient } from "@prisma/client";
import {
  calculateAvg,
  calculateObp,
  calculateSlg,
  calculateOps,
  calculateEra,
  calculateWhip,
  calculateWpct,
  convertIpToValue,
  convertValueToIp,
} from "./stats";

export async function calculateTeamSummary(prisma: PrismaClient, seasonId: string, gameTypes: string[], inningsPerGame: number) {
  const confirmedGames = await prisma.game.findMany({
    where: { seasonId, status: "CONFIRMED", gameType: { in: gameTypes } },
    orderBy: { gameDate: "asc" },
  });

  let wins = 0, losses = 0, draws = 0;
  let ourScoreSum = 0, opponentScoreSum = 0;

  confirmedGames.forEach((g) => {
    ourScoreSum += g.ourScore;
    opponentScoreSum += g.opponentScore;
    if (g.result === "WIN") wins++;
    else if (g.result === "LOSS") losses++;
    else if (g.result === "DRAW") draws++;
  });

  const totalGames = confirmedGames.length;
  const wpct = calculateWpct(wins, losses);
  const avgRuns = totalGames > 0 ? ourScoreSum / totalGames : 0;
  const avgRunsAllowed = totalGames > 0 ? opponentScoreSum / totalGames : 0;

  const allBatting = await prisma.battingRecord.findMany({
    where: { game: { seasonId, status: "CONFIRMED", gameType: { in: gameTypes } } },
  });

  let teamBat = { atBats: 0, hits: 0, doubles: 0, triples: 0, homeRuns: 0, walks: 0, hitByPitch: 0, sacrifice: 0 };
  allBatting.forEach((b) => {
    teamBat.atBats += b.atBats;
    teamBat.hits += b.hits;
    teamBat.doubles += b.doubles;
    teamBat.triples += b.triples;
    teamBat.homeRuns += b.homeRuns;
    teamBat.walks += b.walks;
    teamBat.hitByPitch += b.hitByPitch;
    teamBat.sacrifice += b.sacrifice;
  });

  const teamAvg = calculateAvg(teamBat.hits, teamBat.atBats);
  const teamObp = calculateObp(teamBat.hits, teamBat.walks, teamBat.hitByPitch, teamBat.atBats, teamBat.sacrifice);
  const teamSlg = calculateSlg(teamBat.hits, teamBat.doubles, teamBat.triples, teamBat.homeRuns, teamBat.atBats);
  const teamOps = calculateOps(teamObp, teamSlg);

  const allPitching = await prisma.pitchingRecord.findMany({
    where: { game: { seasonId, status: "CONFIRMED", gameType: { in: gameTypes } } },
  });

  let teamPitch = { inningsPitchedValue: 0.0, walksAllowed: 0, hitsAllowed: 0, earnedRuns: 0 };
  allPitching.forEach((p) => {
    teamPitch.inningsPitchedValue += convertIpToValue(p.inningsPitched);
    teamPitch.walksAllowed += p.walksAllowed;
    teamPitch.hitsAllowed += p.hitsAllowed;
    teamPitch.earnedRuns += p.earnedRuns;
  });

  const teamIp = convertValueToIp(teamPitch.inningsPitchedValue);
  const teamEra = calculateEra(teamPitch.earnedRuns, teamIp, inningsPerGame);
  const teamWhip = calculateWhip(teamPitch.walksAllowed, teamPitch.hitsAllowed, teamIp);

  return {
    totalGames,
    wins,
    losses,
    draws,
    wpct,
    avgRuns,
    avgRunsAllowed,
    teamBatting: { avg: teamAvg, obp: teamObp, slg: teamSlg, ops: teamOps },
    teamPitching: { era: teamEra, whip: teamWhip, inningsPitched: teamIp },
  };
}
