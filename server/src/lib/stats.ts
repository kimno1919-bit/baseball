export function convertIpToValue(ip: number): number {
  const integerPart = Math.floor(ip);
  const fractionPart = Math.round((ip - integerPart) * 10);
  return integerPart + fractionPart / 3;
}

export function convertValueToIp(value: number): number {
  const integerPart = Math.floor(value);
  const fraction = value - integerPart;
  let outs = 0;
  if (fraction >= 0.6) {
    outs = 2;
  } else if (fraction >= 0.3) {
    outs = 1;
  }
  return integerPart + outs / 10;
}

export function calculateAvg(hits: number, atBats: number): number {
  if (atBats === 0) return 0;
  return hits / atBats;
}

export function calculateObp(
  hits: number,
  walks: number,
  hitByPitch: number,
  atBats: number,
  sacrifice: number
): number {
  const denominator = atBats + walks + hitByPitch + sacrifice;
  if (denominator === 0) return 0;
  return (hits + walks + hitByPitch) / denominator;
}

export function calculateSlg(
  hits: number,
  doubles: number,
  triples: number,
  homeRuns: number,
  atBats: number
): number {
  if (atBats === 0) return 0;
  const singles = hits - (doubles + triples + homeRuns);
  const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
  return totalBases / atBats;
}

export function calculateOps(obp: number, slg: number): number {
  return obp + slg;
}

export function calculateEra(earnedRuns: number, ip: number, inningsPerGame: number = 7): number {
  const ipValue = convertIpToValue(ip);
  if (ipValue === 0) return 0;
  return (earnedRuns * inningsPerGame) / ipValue;
}

export function calculateWhip(walksAllowed: number, hitsAllowed: number, ip: number): number {
  const ipValue = convertIpToValue(ip);
  if (ipValue === 0) return 0;
  return (walksAllowed + hitsAllowed) / ipValue;
}

export function calculateKPerIp(strikeouts: number, ip: number): number {
  const ipValue = convertIpToValue(ip);
  if (ipValue === 0) return 0;
  return strikeouts / ipValue;
}

export function calculateWpct(wins: number, losses: number): number {
  const totalDecisions = wins + losses;
  if (totalDecisions === 0) return 0;
  return wins / totalDecisions;
}

export function formatRate(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return ".000";
  const formatted = val.toFixed(3);
  if (formatted.startsWith("0.")) {
    return formatted.substring(1);
  }
  return formatted;
}

export function formatDecimal(val: number, digits: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return "0.00";
  return val.toFixed(digits);
}
