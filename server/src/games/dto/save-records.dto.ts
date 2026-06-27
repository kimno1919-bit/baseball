import { IsNotEmpty, IsString, IsIn, IsObject, IsArray, IsOptional } from 'class-validator';

export class SaveRecordsDto {
  @IsNotEmpty({ message: '액션(SAVE/CONFIRM) 구분값은 필수입니다.' })
  @IsString()
  @IsIn(['SAVE', 'CONFIRM'], { message: '올바른 액션 값은 SAVE 또는 CONFIRM 입니다.' })
  action: 'SAVE' | 'CONFIRM';

  @IsOptional()
  @IsObject()
  score?: {
    inningScores: Array<{
      inning: number;
      our: number;
      opp: number;
    }>;
  };

  @IsOptional()
  @IsArray()
  battingRecords?: Array<{
    userId: string;
    plateAppearances: number;
    atBats: number;
    hits: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    runs: number;
    rbis: number;
    walks: number;
    strikeouts: number;
    stolenBases: number;
    hitByPitch: number;
    sacrifice: number;
  }>;

  @IsOptional()
  @IsArray()
  pitchingRecords?: Array<{
    userId: string;
    inningsPitched: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walksAllowed: number;
    strikeouts: number;
    homeRunsAllowed: number;
    pitchCount: number;
    decision: string;
  }>;
}
