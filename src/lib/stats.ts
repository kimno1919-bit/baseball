/**
 * 투구 이닝(decimal 형식, 예: 5.2 = 5이닝 2아웃)을 실제 수학적 수치(5.666...)로 변환합니다.
 */
export function convertIpToValue(ip: number): number {
  const integerPart = Math.floor(ip);
  const fractionPart = Math.round((ip - integerPart) * 10); // 아웃 카운트 (0, 1, 2)
  return integerPart + fractionPart / 3;
}

/**
 * 수학적 수치를 다시 야구 이닝 표기법(예: 5.666... -> 5.2)으로 변환합니다.
 */
export function convertValueToIp(value: number): number {
  const integerPart = Math.floor(value);
  const fraction = value - integerPart;
  // 0.333... 이면 .1, 0.666... 이면 .2
  let outs = 0;
  if (fraction >= 0.6) {
    outs = 2;
  } else if (fraction >= 0.3) {
    outs = 1;
  }
  return integerPart + outs / 10;
}

/**
 * 타율(AVG) 계산
 */
export function calculateAvg(hits: number, atBats: number): number {
  if (atBats === 0) return 0;
  return hits / atBats;
}

/**
 * 출루율(OBP) 계산
 * (안타 + 볼넷 + 사구) / (타수 + 볼넷 + 사구 + 희생타)
 */
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

/**
 * 장타율(SLG) 계산
 * 루타수 / 타수
 * 루타수 = 단타(Hits - 2B - 3B - HR) + 2*2B + 3*3B + 4*HR
 */
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

/**
 * OPS 계산 (OBP + SLG)
 */
export function calculateOps(obp: number, slg: number): number {
  return obp + slg;
}

/**
 * 평균자책점(ERA) 계산
 * (자책점 * 경기당 정규 이닝수) / 투구이닝
 */
export function calculateEra(earnedRuns: number, ip: number, inningsPerGame: number = 7): number {
  const ipValue = convertIpToValue(ip);
  if (ipValue === 0) return 0;
  return (earnedRuns * inningsPerGame) / ipValue;
}

/**
 * WHIP 계산
 * (볼넷 허용 + 피안타) / 투구이닝
 */
export function calculateWhip(walksAllowed: number, hitsAllowed: number, ip: number): number {
  const ipValue = convertIpToValue(ip);
  if (ipValue === 0) return 0;
  return (walksAllowed + hitsAllowed) / ipValue;
}

/**
 * 삼진율 (K/IP, 이닝당 탈삼진)
 */
export function calculateKPerIp(strikeouts: number, ip: number): number {
  const ipValue = convertIpToValue(ip);
  if (ipValue === 0) return 0;
  return strikeouts / ipValue;
}

/**
 * 승률(WPCT) 계산
 * 승 / (승 + 패)
 */
export function calculateWpct(wins: number, losses: number): number {
  const totalDecisions = wins + losses;
  if (totalDecisions === 0) return 0;
  return wins / totalDecisions;
}

/**
 * 소수점 3자리 포맷팅 (예: 0.3333 -> ".333", 1.0000 -> "1.000", 0 -> ".000")
 */
export function formatRate(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return ".000";
  const formatted = val.toFixed(3);
  if (formatted.startsWith("0.")) {
    return formatted.substring(1); // "0.333" -> ".333"
  }
  return formatted;
}

/**
 * 평균자책점/WHIP 등 소수점 2자리 포맷팅
 */
export function formatDecimal(val: number, digits: number = 2): string {
  if (isNaN(val) || val === null || val === undefined) return "0.00";
  return val.toFixed(digits);
}
