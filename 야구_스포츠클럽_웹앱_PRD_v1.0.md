# 야구 스포츠클럽 웹앱 PRD (Product Requirements Document)

> 학교 스포츠클럽 야구반을 위한 경기 결과 분석 및 출결 관리 웹앱

---

## 문서 정보

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-06-27 |
| 상태 | 최종 확정 (개발 착수 준비) |
| 대상 독자 | 기획자, 디자이너, 개발자, QA, 학교 운영진 |

---

## 목차

1. [제품 개요](#1-제품-개요)
2. [사용자 정의](#2-사용자-정의)
3. [핵심 사용자 플로우](#3-핵심-사용자-플로우)
4. [데이터 모델](#4-데이터-모델)
5. [화면 설계](#5-화면-설계)
6. [기능 명세 (User Story)](#6-기능-명세-user-story)
7. [기술 아키텍처](#7-기술-아키텍처)
8. [보안 및 개인정보](#8-보안-및-개인정보)
9. [디자인 시스템](#9-디자인-시스템)
10. [개발 일정](#10-개발-일정)
11. [운영 비용](#11-운영-비용)
12. [리스크 및 대응](#12-리스크-및-대응)
13. [확장 로드맵](#13-확장-로드맵)

---

## 1. 제품 개요

### 1-1. 배경 및 문제 정의

학교 스포츠클럽 야구반은 현재 수기 또는 분산된 도구(엑셀, 메신저, 종이 출석부 등)로 운영되고 있다. 이로 인해 다음과 같은 문제가 발생한다.

- 출결 관리가 비효율적이며 누락이 발생함
- 경기 기록이 분산되어 시즌 통계 산출이 어려움
- 학생 개인의 성장 추이를 한눈에 보기 어려움
- 교사·매니저·부원 간 정보 비대칭 발생

### 1-2. 제품 비전

> 학교 스포츠클럽 야구반을 위한 출결·기록·통계 올인원 웹앱

### 1-3. 목표 (Goals)

**정량 목표 (출시 후 1시즌 기준)**
- 부원 등록률 90% 이상
- 경기당 출결 응답률 80% 이상
- 경기 기록 입력 완료율 95% 이상

**정성 목표**
- 학생도 1분 내 출결 응답 가능한 UX
- 교사 업무 부담 50% 절감
- 학생의 성장 데이터 가시화

### 1-4. 비목표 (Non-Goals)

- 회비/결제 기능 (학교 예산 운영이므로 불필요)
- 다중 학교/클럽 운영 (1학교 1클럽 정책)
- 학부모 전용 기능
- 실시간 경기 중계 입력 (경기 종료 후 일괄 입력만)
- 다국어 (한국어만)

### 1-5. 프로젝트 컨텍스트

| 항목 | 결정 |
|---|---|
| 타깃 사용자 | 학교 스포츠클럽 참여 학생 (초/중/고) |
| MVP 범위 | 당일 경기 기록 + 출결 + 개인 타격/투구 기본 스탯 |
| 플랫폼 | 웹앱 (반응형, 모바일 우선) |
| 사용 규모 | 최대 100명 |
| 클럽 구조 | 1학교 = 1클럽 |
| 시즌 기준 | 시즌 단위 통계 집계 |
| 시즌 종료 | 교사 수동 마감 |
| 기록 입력 시점 | 경기 종료 후 일괄 입력 |
| 데이터 공개 범위 | 부원 간 전체 공개 |
| 언어 | 한국어 |

---

## 2. 사용자 정의

### 2-1. 사용자 역할 (Role)

| 역할 | 권한 | 비고 |
|---|---|---|
| **교사 (ADMIN)** | 클럽 생성, 경기 등록, 출결/기록 최종 확정, 멤버 관리, 모든 기록 수정 가능 | 클럽당 1~2명 |
| **매니저 (MANAGER)** | 출결 체크, 라인업 등록, 경기 기록 입력 및 확정 가능 | 교사가 지정 |
| **부원 (MEMBER)** | 본인 출결 표시, 본인·타 부원 기록 조회, 팀 통계 조회 | 다수 사용자 |

### 2-2. 사용자 시나리오 요약

```
[학생 시나리오]
가입 신청 → 교사 승인 → 출결 응답 → 경기 후 기록 확인 → 시즌 성적 조회

[교사 시나리오]
클럽/시즌 생성 → 가입 승인 → 경기 등록 → 출결 현황 확인 →
당일 출석 체크 → 라인업 등록 → 기록 입력 → 최종 확정

[매니저 시나리오]
당일 출석 체크 → 라인업 등록 → 기록 입력 → 직접 확정
```

---

## 3. 핵심 사용자 플로우

### 플로우 1: 클럽 가입 및 온보딩

```
[학생]
시작 → 초대 코드 입력 → 회원가입(이름, 학번, 비밀번호, 전화번호)
     → 프로필 입력(포지션, 등번호, 타격/투구 손)
     → 교사 승인 대기 → 승인 완료 → 메인 대시보드
```

### 플로우 2: 경기 일정 등록 (교사)

```
[교사]
대시보드 → '경기 등록' → 일시/장소/상대팀/경기유형 입력
        → 참가 대상자 선택 → 출결 마감시간 설정
        → 등록 → 부원에게 인앱 알림 발송
```

### 플로우 3: 출결 응답 (학생)

```
[학생]
알림/대시보드 → 다가오는 경기 확인 → 참석/불참/미정 선택
            → (불참 시) 사유 입력 → 제출
            → 마감 전까지 변경 가능
```

### 플로우 4: 당일 경기 기록 입력 (교사 또는 매니저) ⭐ 핵심

```
[교사/매니저]
경기 당일 → 해당 경기 선택 → 출석 체크
        → 라인업 등록(타순, 포지션, 선발투수)
        → 경기 종료 후 기록 입력
          ├─ 이닝별 스코어
          ├─ 타자별 기록(타수/안타/홈런/타점/득점/볼넷/삼진 등)
          ├─ 투수별 기록(이닝/실점/자책/탈삼진/볼넷/피안타 등)
        → 임시저장 → 최종 확정 → 통계 즉시 반영
```

### 플로우 5: 통계/기록 조회

```
[부원]
마이페이지 → 본인 시즌 성적 카드(타율/출루율/장타율/OPS/방어율)
         → 경기별 상세 기록 리스트
         → 팀 내 랭킹 확인

대시보드 → 팀 통계 → 전적/득실점/팀 타율
        → 동료 성적 자유 조회
```

### 플로우 6: 알림 시스템

| 트리거 | 수신자 | 채널 |
|---|---|---|
| 경기 등록 | 참가 대상자 | 인앱 |
| 경기 수정/삭제 | 참가 대상자 | 인앱 |
| 권한 변경 | 해당 학생 | 인앱 |
| 가입 승인/거절 | 신청자 | 인앱 |
| 기록 확정 | 출전자 | 인앱 |
| 가입 신청 | 교사 | 인앱 |

> 자동 미응답 리마인더 없음. 사용자가 인앱에서 직접 확인.

---

## 4. 데이터 모델

### 4-1. 엔티티 관계 개요

```
[Club] ──┬── [Season] ──┬── [Game] ──┬── [Lineup]
         │              │            ├── [BattingRecord]
         │              │            ├── [PitchingRecord]
         │              │            └── [Attendance]
         └── [User] ────┴──── [Invitation]
                 │
                 └── [Notification]
```

### 4-2. 엔티티 명세

#### Club (클럽)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| school_name | string | 학교명 |
| club_name | string | 클럽명 |
| invite_code | string | 가입용 초대 코드 (6자리) |
| created_at | datetime | |

#### User (사용자)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| club_id | FK | |
| login_id | string | 학번 |
| password_hash | string | bcrypt 해시 |
| name | string | 이름 |
| phone | string | 전화번호 (AES-256 암호화) |
| role | enum | `ADMIN` / `MANAGER` / `MEMBER` |
| status | enum | `PENDING` / `ACTIVE` / `INACTIVE` |
| jersey_number | int | 등번호 |
| primary_position | enum | P/C/1B/2B/3B/SS/LF/CF/RF/DH |
| batting_hand | enum | L/R/S |
| throwing_hand | enum | L/R |
| joined_at | datetime | |

#### Season (시즌)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| club_id | FK | |
| name | string | "2026 상반기" 등 |
| start_date | date | |
| end_date | date | |
| innings_per_game | int | 정규 이닝 수 (기본 7) |
| mercy_rule_diff | int | 콜드게임 점수차 |
| is_active | boolean | 현재 시즌 여부 |

#### Invitation (가입 신청)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| club_id | FK | |
| applicant_name | string | |
| applicant_login_id | string | |
| status | enum | `PENDING` / `APPROVED` / `REJECTED` |
| reviewed_by | FK(User) | |
| created_at | datetime | |

#### Game (경기)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| season_id | FK | |
| game_date | datetime | 경기 일시 |
| location | string | 경기장 |
| opponent_name | string | 상대팀명 |
| game_type | enum | `PRACTICE` / `LEAGUE` / `TOURNAMENT` / `FRIENDLY` |
| attendance_deadline | datetime | 출결 마감 |
| status | enum | `SCHEDULED` / `IN_PROGRESS` / `RECORD_PENDING` / `CONFIRMED` |
| our_score | int | 우리팀 총득점 |
| opponent_score | int | 상대팀 총득점 |
| result | enum | `WIN` / `LOSS` / `DRAW` |
| inning_scores | json | `[{inning:1, our:2, opp:0}, ...]` |
| confirmed_by | FK(User) | |
| created_by | FK(User) | |

#### Attendance (출결)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| game_id | FK | |
| user_id | FK | |
| response | enum | `ATTEND` / `ABSENT` / `UNDECIDED` |
| absent_reason | string | 불참 사유 (선택) |
| actual_attended | boolean | 실제 출석 여부 |
| responded_at | datetime | |

#### Lineup (라인업)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| game_id | FK | |
| user_id | FK | |
| batting_order | int | 타순 (1~9, 대타는 NULL) |
| position | enum | 수비 포지션 |
| is_starter | boolean | 선발 여부 |
| is_starting_pitcher | boolean | 선발투수 여부 |

#### BattingRecord (타격 기록)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| game_id | FK | |
| user_id | FK | |
| plate_appearances | int | 타석 (PA) |
| at_bats | int | 타수 (AB) |
| hits | int | 안타 (H) |
| doubles | int | 2루타 |
| triples | int | 3루타 |
| home_runs | int | 홈런 (HR) |
| runs | int | 득점 (R) |
| rbis | int | 타점 (RBI) |
| walks | int | 볼넷 (BB) |
| strikeouts | int | 삼진 (SO) |
| stolen_bases | int | 도루 (SB) |
| hit_by_pitch | int | 사구 (HBP) |
| sacrifice | int | 희생타 (SAC) |

> 단타는 자동 계산: `singles = hits - doubles - triples - home_runs`

#### PitchingRecord (투구 기록)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| game_id | FK | |
| user_id | FK | |
| innings_pitched | decimal | 이닝 (IP, 예: 5.2 = 5와 2/3이닝) |
| hits_allowed | int | 피안타 |
| runs_allowed | int | 실점 |
| earned_runs | int | 자책점 (ER) |
| walks_allowed | int | 볼넷 허용 |
| strikeouts | int | 탈삼진 (K) |
| home_runs_allowed | int | 피홈런 |
| pitch_count | int | 투구수 (선택) |
| decision | enum | `WIN` / `LOSS` / `SAVE` / `HOLD` / `NONE` |

#### Notification (알림)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| user_id | FK | 수신자 |
| type | enum | `GAME_CREATED` / `GAME_UPDATED` / `ROLE_CHANGED` / `JOIN_APPROVED` / `RECORD_CONFIRMED` 등 |
| title | string | |
| body | string | |
| link_url | string | 클릭 시 이동 경로 |
| is_read | boolean | |
| created_at | datetime | |

### 4-3. 야구 기록 계산식

**타격 지표**

| 지표 | 약어 | 계산식 |
|---|---|---|
| 타율 | AVG | `H / AB` |
| 출루율 | OBP | `(H + BB + HBP) / (AB + BB + HBP + SF)` |
| 장타율 | SLG | `(1B + 2×2B + 3×3B + 4×HR) / AB` |
| OPS | OPS | `OBP + SLG` |
| 타점/경기 | RBI/G | `RBI / G` |

**투구 지표**

| 지표 | 약어 | 계산식 |
|---|---|---|
| 평균자책점 | ERA | `(ER × innings_per_game) / IP` |
| WHIP | WHIP | `(BB + H) / IP` |
| 탈삼진/이닝 | K/IP | `K / IP` |
| 승률 | WPCT | `W / (W + L)` |

> ERA 계산은 시즌별 `innings_per_game` 설정값 사용

### 4-4. 통계 집계 전략

- **실시간 집계 쿼리** 방식 채택 (100명 규모 적합)
- 캐시 테이블 미운영 (단순성 우선)

### 4-5. 데이터 보존/폐기 정책

- **시즌 수동 마감 시 자동 배치 실행**
  - `INACTIVE` 부원의 해당 시즌 기록(BattingRecord, PitchingRecord, Attendance, Lineup) 폐기
  - 폐기 전 시즌 통계 누계는 익명화하여 스냅샷에 보관
- **시즌 스냅샷**: S3에 `seasons/{season_id}/snapshot.json` 형태로 저장

---

## 5. 화면 설계

### 5-1. 정보 구조 (IA)

```
[비로그인]
├── 로그인
└── 가입 신청 (초대 코드)

[로그인 후 공통]
└── 대시보드 (홈)

[일정/경기]
├── 경기 목록
├── 경기 상세 (개요/출결/라인업/기록 탭)
└── 경기 등록 (교사)

[기록/통계]
├── 시즌 통계 대시보드
├── 개인 기록 상세
├── 팀 랭킹
└── 경기별 기록

[마이페이지]
├── 내 프로필
├── 내 시즌 성적
├── 내 출결 이력
└── 알림 설정

[관리 메뉴 (교사)]
├── 부원 관리
├── 시즌 관리
├── 가입 신청 처리
└── 클럽 설정
```

### 5-2. 화면 목록

| No | 화면명 | 권한 | 우선순위 |
|---|---|---|---|
| S01 | 로그인 | 전체 | P0 |
| S02 | 가입 신청 | 전체 | P0 |
| S03 | 대시보드(홈) | 로그인 | P0 |
| S04 | 경기 목록 | 로그인 | P0 |
| S05 | 경기 상세 | 로그인 | P0 |
| S06 | 경기 등록/수정 | 교사 | P0 |
| S07 | 출결 응답 | 학생 | P0 |
| S08 | 출결 현황 (당일 체크) | 교사/매니저 | P0 |
| S09 | 라인업 등록 | 교사/매니저 | P0 |
| S10 | 경기 기록 입력 | 교사/매니저 | P0 |
| S11 | 시즌 통계 대시보드 | 로그인 | P0 |
| S12 | 개인 기록 상세 | 로그인 | P0 |
| S13 | 팀 랭킹 | 로그인 | P1 |
| S14 | 마이페이지 | 로그인 | P0 |
| S15 | 알림 목록 | 로그인 | P1 |
| S16 | 부원 관리 | 교사 | P0 |
| S17 | 시즌 관리 | 교사 | P0 |
| S18 | 클럽 설정 | 교사 | P1 |

### 5-3. 글로벌 레이아웃

```
모바일:
┌────────────────────────────┐
│  [Header]                  │
│  로고 | 알림 | 프로필      │
├────────────────────────────┤
│       [Content Area]       │
├────────────────────────────┤
│ [Bottom Nav]               │
│ 홈 | 경기 | 통계 | 마이    │
└────────────────────────────┘

데스크탑: 좌측 사이드바 네비게이션
교사 전용 메뉴: "마이" 탭 내 "관리" 섹션 노출
```

### 5-4. 주요 화면 상세

#### S10. 경기 기록 입력 (핵심 화면)

**탭 구조**: `[ 스코어 ] [ 타격 ] [ 투구 ]`

- **스코어 탭**: 이닝별 점수 입력, 합계/승패 자동 판정
- **타격 탭**: 라인업 순서대로 14개 항목 입력, 실시간 타율/OPS 미리보기
- **투구 탭**: 등판 투수만 9개 항목 입력, 실시간 ERA/WHIP 미리보기
- **공통 액션**: 5분 자동 임시저장, [최종 확정] 버튼

### 5-5. UI/UX 설계 원칙

| 원칙 | 내용 |
|---|---|
| 모바일 우선 | 학생 대다수가 스마트폰 사용 |
| 1분 입력 | 출결 응답은 3탭 이내 완료 |
| 권한 시각화 | 교사/매니저 전용 액션은 별도 색상/아이콘 |
| 단계별 확정 | 임시저장 → 확정 2단계 |
| 빈 상태 안내 | "아직 경기가 없습니다" + 다음 액션 가이드 |
| 즉시 유효성 표시 | 라인업 9명 미달, 중복 등 즉시 경고 |

---

## 6. 기능 명세 (User Story)

> 형식: `As a [role], I want to [action], so that [goal].`
> Acceptance Criteria는 Given/When/Then 패턴 사용

### EPIC 1. 인증 및 가입

#### US-101 (P0) | 학생 가입 신청

> As a 학생, I want to 초대 코드로 가입 신청을 하고, so that 클럽 부원이 될 수 있다.

- Given 가입 신청 화면, When 초대 코드 입력, Then 유효성 검증 후 양식 표시
- Given 양식, When 이름/학번/비밀번호/전화번호/포지션/등번호/타격손/투구손 입력 후 제출, Then `PENDING` 상태로 저장
- Given 동일 학번 존재, Then "이미 등록된 학번입니다" 오류
- Given 잘못된 초대 코드, Then "유효하지 않은 코드입니다" 오류
- Given 신청 완료, Then "교사 승인 대기 중" 안내

#### US-102 (P0) | 교사 가입 승인

> As a 교사, I want to 가입 신청을 검토하고 승인/거절하고, so that 적격 학생만 부원으로 받을 수 있다.

- Given 부원 관리 화면, Then `PENDING` 신청 목록 표시
- Given 신청 카드, When [승인] 클릭, Then User `ACTIVE` 생성, 신청 `APPROVED`
- Given 신청 카드, When [거절] 클릭, Then 사유 입력 후 `REJECTED`
- Given 승인 완료, Then 신청자 로그인 가능

#### US-103 (P0) | 로그인

> As a 부원, I want to 학번과 비밀번호로 로그인하고, so that 서비스를 이용할 수 있다.

- Given 로그인 화면, When 학번/비밀번호 입력, Then 인증 후 대시보드 이동
- Given `PENDING` 사용자, Then "승인 대기 중" 안내
- Given `INACTIVE` 사용자, Then "비활성화된 계정" 안내
- Given 5회 연속 실패, Then 10분간 차단

### EPIC 2. 클럽/시즌 관리

#### US-201 (P0) | 시즌 생성

> As a 교사, I want to 새 시즌을 생성하고, so that 해당 기간 통계를 분리 관리할 수 있다.

- Given 시즌 관리 화면, When [새 시즌 등록], Then 입력 모달 표시
- Given 시즌명/시작일/종료일/정규이닝수 입력 후 제출, Then 시즌 생성
- Given 활성 시즌 존재, When 신규 활성화, Then 경고 표시

#### US-202 (P0) | 시즌 수동 마감

> As a 교사, I want to 시즌을 수동으로 마감하고, so that 통계를 확정할 수 있다.

- Given 활성 시즌, When [마감] 클릭, Then 확인 모달
- Given 확인, Then `is_active=false`, 스냅샷 저장, 비활성 부원 기록 폐기 배치 실행
- Given 마감 시즌, When 경기 등록 시도, Then "마감된 시즌입니다" 표시
- Given 마감 시즌, Then 조회는 가능

### EPIC 3. 부원/권한 관리

#### US-301 (P0) | 매니저 권한 부여

> As a 교사, I want to 학생에게 매니저 권한을 부여하고, so that 기록 입력 업무를 위임할 수 있다.

- Given 부원 행, When [권한 변경] → MANAGER, Then `role` 업데이트
- Given MANAGER 변경, Then 해당 학생에게 인앱 알림
- Given MANAGER → MEMBER 회수, Then 동일 처리

#### US-302 (P1) | 부원 비활성화

> As a 교사, I want to 졸업/전학한 학생을 비활성화하고, so that 부원 목록을 정돈할 수 있다.

- Given 부원 행, When [비활성화], Then `status=INACTIVE`
- Given 비활성 부원, Then 신규 경기 대상자에서 제외
- Given 과거 기록, Then 시즌 마감 전까지는 보존

### EPIC 4. 경기 일정

#### US-401 (P0) | 경기 등록

> As a 교사, I want to 경기를 등록하고, so that 부원들이 출결 응답을 할 수 있다.

- Given 경기 등록 화면, When 일시/장소/상대팀/유형/마감/대상자 입력 후 저장, Then 경기 생성 (`SCHEDULED`)
- Given 출결 마감 > 경기 시간, Then 유효성 오류
- Given 등록 완료, Then 대상자에게 인앱 알림
- Given 활성 시즌 없음, Then 등록 불가

#### US-402 (P0) | 경기 수정/삭제

> As a 교사, I want to 경기를 수정/삭제하고, so that 변경사항을 반영할 수 있다.

- Given `SCHEDULED`, Then 모든 필드 수정/삭제 가능
- Given `CONFIRMED`, Then 일시/장소만 수정, 삭제 불가
- Given 수정, Then 대상자 알림

#### US-403 (P0) | 경기 목록 조회

> As a 부원, I want to 경기 목록을 보고, so that 일정과 결과를 확인할 수 있다.

- Given 경기 목록, Then 현재 시즌 경기 최신순 표시
- Given 필터 (예정/진행중/종료), Then 해당 상태만 표시
- Given 시즌 변경, Then 해당 시즌 경기로 갱신
- Given 카드 클릭, Then 경기 상세 이동

### EPIC 5. 출결 관리

#### US-501 (P0) | 출결 응답

> As a 학생, I want to 경기 참석 의사를 표시하고, so that 운영진이 인원을 파악할 수 있다.

- Given 응답 화면, When 참석/불참/미정 선택 후 제출, Then 저장
- Given 불참, When 사유 입력, Then 사유와 함께 저장
- Given 마감 전, Then 변경 가능
- Given 마감 후, Then 변경 불가
- Given 응답 완료, Then 본인 상태 표시

#### US-502 (P0) | 출결 현황 조회

> As a 부원, I want to 전체 출결 현황을 보고, so that 누가 참석하는지 확인할 수 있다.

- Given 출결 탭, Then 참석/불참/미정 카운트 표시
- Given 명단, Then 응답별 그룹화
- Given 미응답자, Then 별도 섹션 표시

#### US-503 (P0) | 당일 출석 체크

> As a 교사/매니저, I want to 경기 당일 실제 출석을 체크하고, so that 라인업 기반이 된다.

- Given 체크 모드, Then 사전 응답이 기본값
- Given 토글, When 클릭, Then 실제 출석 변경
- Given [응답대로 적용], Then 사전 응답대로 일괄 설정
- Given [저장], Then 변경사항 저장
- Given 저장 완료, Then 라인업 등록 진행 가능

### EPIC 6. 라인업

#### US-601 (P0) | 라인업 등록

> As a 교사/매니저, I want to 타순과 포지션을 등록하고, so that 경기 기록의 기준이 마련된다.

- Given 라인업 화면, Then 타순 1~9 행 표시
- Given 각 행, When 선수 선택, Then 당일 출석자만 드롭다운
- Given 포지션 선택, Then 9개 중 선택
- Given 선발투수, Then 정확히 1명
- 검증:
  - 9명 미등록 시 "9명을 모두 등록하세요"
  - 동일 선수 중복 시 "중복된 선수가 있습니다"
  - 선발투수 미지정 시 "선발투수를 지정하세요"
- Given 검증 통과, Then 저장 및 기록 입력 진입

#### US-602 (P1) | 교체 명단 추가

> As a 교사/매니저, I want to 교체 선수를 추가하고, so that 등판 투수나 대타도 기록할 수 있다.

- Given [교체 명단 추가], Then 추가 행 표시
- Given 추가 선수, Then 타순 없이 포지션만 등록
- Given 저장, Then 별도 그룹으로 저장

### EPIC 7. 경기 기록 입력 ⭐

#### US-701 (P0) | 스코어 입력

> As a 교사/매니저, I want to 이닝별 점수를 입력하고, so that 경기 결과가 산출된다.

- Given 스코어 탭, Then 시즌 설정 이닝 수만큼 칼럼 표시
- Given 점수 입력, Then 합계 자동 갱신
- Given 합계, Then 승/패/무 자동 판정
- Given 미진행 이닝, Then 빈 값 허용

#### US-702 (P0) | 타격 기록 입력

> As a 교사/매니저, I want to 선수별 타격 기록을 입력하고, so that 개인 스탯이 축적된다.

- Given 타격 탭, Then 라인업 순서대로 선수 카드 표시
- Given 각 카드, Then 14개 항목 입력 (빈도 낮은 항목 접기)
- Given 단타, Then `H - 2B - 3B - HR` 자동 계산
- 검증:
  - `H >= 2B + 3B + HR`
  - `AB <= PA`
  - 위반 시 행 단위 오류 표시
- Given 입력 진행, Then 실시간 타율/OPS 미리보기

#### US-703 (P0) | 투구 기록 입력

> As a 교사/매니저, I want to 등판한 투수의 기록을 입력하고, so that 투수 스탯이 축적된다.

- Given 투구 탭, Then 선발투수 기본 표시, [+ 추가] 가능
- Given 추가 가능, Then 출석자 중 미등판자만 노출
- Given 각 투수, Then 9개 항목 입력
- Given 이닝 입력, Then 가이드 표시 (5.1 = 5와 1/3)
- Given 결정 (W/L/S/H/없음), Then 한 경기당 W 1명, L 1명만
- Given 입력 진행, Then 실시간 ERA/WHIP 미리보기

#### US-704 (P0) | 임시저장 및 자동저장

> As a 교사/매니저, I want to 입력 중 자동 저장이 되고, so that 데이터 손실을 방지할 수 있다.

- Given 기록 입력 화면, Then 5분마다 자동 임시저장
- Given [임시저장], Then 즉시 저장
- Given 재진입, Then 이어서 입력 가능
- Given 임시저장 상태, Then status `RECORD_PENDING`

#### US-705 (P0) | 기록 최종 확정

> As a 교사/매니저, I want to 기록을 최종 확정하고, so that 통계에 반영된다.

- Given [최종 확정], Then 전체 유효성 재검증
- Given 검증 통과, Then 확인 모달
- Given 확정, Then status `CONFIRMED`, 통계 즉시 반영
- Given 매니저 확정, Then 교사에게 알림
- Given 출전 부원, Then "기록이 확정되었습니다" 알림

#### US-706 (P0) | 확정된 기록 수정 (교사)

> As a 교사, I want to 확정된 기록도 수정할 수 있고, so that 오류를 정정할 수 있다.

- Given `CONFIRMED`, When 교사가 [수정], Then 기록 입력 화면 진입
- Given 매니저, When 확정 후 수정 시도, Then 버튼 비활성화 + "교사만 수정 가능"
- Given 수정 후 재확정, Then 통계 재계산 및 알림

### EPIC 8. 통계 및 조회

#### US-801 (P0) | 시즌 통계 대시보드

> As a 부원, I want to 시즌 전체 통계를 보고, so that 팀 성적을 파악할 수 있다.

- Given 대시보드, Then 시즌 드롭다운 (기본: 활성)
- Given 표시 항목: 전적, 승률, 평균득점/실점, 팀 타율/OPS/ERA
- Given 최근 5경기, Then 추세 그래프
- Given 카테고리별 TOP 3 미리보기

#### US-802 (P0) | 개인 기록 상세 조회

> As a 부원, I want to 본인 또는 타 부원의 시즌 기록을 보고, so that 성적을 확인할 수 있다.

- Given 개인 기록 화면, Then 시즌 누계 + 평균 카드
- Given 경기별 기록, Then 표 형식
- Given 추이 그래프, Then 누적 타율 변화
- Given 본인/타인 동일 구조 (전체 공개)

#### US-803 (P1) | 팀 랭킹

> As a 부원, I want to 카테고리별 랭킹을 보고, so that 누가 잘하는지 알 수 있다.

- Given 랭킹 화면, Then 카테고리 탭 (타율/OPS/홈런/타점/ERA/탈삼진)
- Given 규정 충족자만 표시, 미달자는 별도 섹션
- Given 동률, Then 경기 수 적은 순 우선

### EPIC 9. 알림

#### US-901 (P0) | 인앱 알림 수신

> As a 부원, I want to 알림을 받고, so that 중요한 변경사항을 인지할 수 있다.

- Given 헤더 알림, Then 미읽음 뱃지 표시
- Given 클릭, Then 알림 목록 표시
- Given 항목 클릭, Then 관련 화면 이동 및 읽음 처리
- 트리거: 경기 등록, 수정/삭제, 권한 변경, 가입 승인/거절, 기록 확정

#### US-902 (P1) | 알림 설정

> As a 부원, I want to 알림 유형별 수신 여부를 설정하고, so that 원치 않는 알림을 끌 수 있다.

- Given 설정 화면, Then 유형별 토글
- Given 토글 off, Then 미수신

### EPIC 10. 마이페이지

#### US-1001 (P0) | 프로필 편집

> As a 부원, I want to 본인 프로필을 편집하고, so that 정보를 최신 상태로 유지할 수 있다.

- Given 편집, Then 등번호/포지션/타격손/투구손/전화번호 수정 가능
- Given 이름/학번, Then 교사만 수정 가능
- Given 비밀번호 변경, Then 현재 비밀번호 입력 필요

#### US-1002 (P0) | 다크모드 전환

> As a 부원, I want to 다크모드를 전환하고, so that 환경에 맞게 사용할 수 있다.

- Given 마이페이지, Then 라이트/다크/시스템 옵션
- Given 선택, Then 즉시 적용 및 저장
- Given 재방문, Then 마지막 설정 유지

### 우선순위 분포

| Epic | P0 | P1 | 합계 |
|---|---|---|---|
| 인증 및 가입 | 3 | 0 | 3 |
| 클럽/시즌 관리 | 2 | 0 | 2 |
| 부원/권한 관리 | 1 | 1 | 2 |
| 경기 일정 | 3 | 0 | 3 |
| 출결 관리 | 3 | 0 | 3 |
| 라인업 | 1 | 1 | 2 |
| 경기 기록 입력 | 6 | 0 | 6 |
| 통계 및 조회 | 2 | 1 | 3 |
| 알림 | 1 | 1 | 2 |
| 마이페이지 | 2 | 0 | 2 |
| **합계** | **24** | **4** | **28** |

---

## 7. 기술 아키텍처

### 7-1. 기술 스택

**프론트엔드**

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| 상태관리 | TanStack Query + Zustand |
| 폼 | React Hook Form + Zod |
| 차트 | Recharts |
| 알림 | 폴링 또는 SSE |

**백엔드**

| 영역 | 선택 |
|---|---|
| 런타임 | Node.js 20 LTS |
| 프레임워크 | NestJS |
| 언어 | TypeScript |
| ORM | Prisma |
| 인증 | JWT (Access + Refresh) |
| 검증 | class-validator |
| 스케줄러 | node-cron |

**인프라**

| 영역 | 선택 |
|---|---|
| RDB | PostgreSQL 16 |
| 파일 저장 | AWS S3 또는 Cloudflare R2 |
| FE 호스팅 | Vercel |
| BE 호스팅 | Railway 또는 Render |
| DB 호스팅 | Supabase 또는 Neon |
| 모니터링 | Sentry |
| CI/CD | GitHub Actions |

### 7-2. 시스템 구성도

```
[사용자 브라우저]
       │ HTTPS
       ▼
┌──────────────┐
│  Cloudflare  │ ← DNS, SSL, CDN
└──────┬───────┘
       │
       ├──────────────────────┐
       ▼                      ▼
┌──────────────┐      ┌──────────────┐
│   Vercel     │      │   Railway    │
│  (Next.js)   │◄────►│  (NestJS)    │
│   Frontend   │ REST │   Backend    │
└──────────────┘      └──────┬───────┘
                             │
                  ┌──────────┼──────────┐
                  ▼          ▼          ▼
            ┌─────────┐ ┌────────┐ ┌────────┐
            │Supabase │ │   S3   │ │ Sentry │
            │Postgres │ │(JSON)  │ │(Logs)  │
            └─────────┘ └────────┘ └────────┘
```

### 7-3. 폴더 구조

```
project-root/
├── apps/
│   ├── web/                 # Next.js 프론트엔드
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   └── api/                 # NestJS 백엔드
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── clubs/
│       │   │   ├── seasons/
│       │   │   ├── games/
│       │   │   ├── attendance/
│       │   │   ├── lineup/
│       │   │   ├── records/
│       │   │   ├── stats/
│       │   │   └── notifications/
│       │   └── common/
│       └── prisma/
├── packages/
│   ├── shared-types/        # 공용 타입
│   └── stats-calc/          # 야구 통계 계산 로직
└── docs/
```

---

## 8. 보안 및 개인정보

### 8-1. 인증/인가

- **JWT 기반**
  - Access Token: 1시간 (HttpOnly Cookie)
  - Refresh Token: 14일 (HttpOnly Cookie)
- **비밀번호 해싱**: bcrypt (cost factor 12)
- **로그인 시도 제한**: 5회 실패 시 10분 차단 (IP + 학번)
- **권한 가드**: NestJS Role Guard

### 8-2. 비밀번호 정책

- 최소 8자 + 영문/숫자 조합
- 정규식: `/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/`
- 프론트엔드: 실시간 강도 표시
- 백엔드: 가입/변경 시 동일 검증

### 8-3. 개인정보 보호

| 항목 | 처리 방식 |
|---|---|
| 이름 | 평문 저장 (표시 목적) |
| 학번 | 평문 저장 (로그인 ID) |
| 전화번호 | AES-256 암호화, 마지막 4자리만 마스킹 표시 |
| 비밀번호 | bcrypt 단방향 해시 |

### 8-4. 데이터 보존/폐기

- 시즌 수동 마감 시 자동 배치:
  - `INACTIVE` 부원의 해당 시즌 기록 폐기
  - 폐기 전 익명화 통계만 스냅샷에 보관
- 스냅샷: S3 `seasons/{season_id}/snapshot.json`

### 8-5. 통신 보안

- 전 구간 HTTPS (별도 도메인 + SSL 준비)
- CORS: 허용 도메인 화이트리스트
- CSRF: SameSite=Strict 쿠키 + CSRF 토큰

### 8-6. 기타

- Rate Limiting: 분당 100 요청 (사용자별)
- 입력값 살균: ValidationPipe + XSS 방지
- DB 백업: Supabase 자동 일 1회 (7일 보관)

---

## 9. 디자인 시스템

### 9-1. 컨셉

학교 분위기에 맞는 단정한 네이비/그린 계열, 라이트/다크 모드 모두 지원

### 9-2. 컬러 팔레트

| 역할 | 라이트 | 다크 |
|---|---|---|
| Primary (네이비) | #1E3A5F | #4A77B5 |
| Secondary (그린) | #2D6A4F | #52B788 |
| Background | #FFFFFF | #0F172A |
| Surface | #F8FAFC | #1E293B |
| Text | #1E293B | #F1F5F9 |
| Border | #E2E8F0 | #334155 |
| Success | #16A34A | #22C55E |
| Warning | #EA580C | #FB923C |
| Danger | #DC2626 | #EF4444 |

### 9-3. 타이포그래피

- 본문: Pretendard 14~16px
- 제목: 18~24px Semi-bold
- 숫자(스탯): Tabular Lining Figures

### 9-4. 컴포넌트 원칙

- 모든 컴포넌트는 다크모드 토큰 기반
- 시스템 prefers-color-scheme 자동 감지 + 수동 전환 가능

---

## 10. 개발 일정

### 마일스톤 (총 14주)

| Phase | 기간 | 주요 작업 | 마일스톤 |
|---|---|---|---|
| Phase 0: 준비 | 1주 | 인프라 셋업, PoC, 디자인 토큰 | - |
| Phase 1: 기반 | 2주 | DB 스키마, 인증, 공통 레이아웃, 부원·시즌 관리 | M1 |
| Phase 2: 일정/출결 | 2주 | 경기 등록, 출결, 알림 | M2 |
| Phase 3: 라인업/기록 | 3주 | 라인업, 스코어/타격/투구 입력, 확정 | M3 |
| Phase 4: 통계 | 2주 | 통계 로직, 대시보드, 개인 기록, 랭킹 | M4 |
| Phase 5: QA | 2주 | 통합 테스트, 보안 점검, 시즌 마감 배치 | M5 |
| Phase 6: 베타/출시 | 2주 | 학교 1곳 베타 + 피드백 반영 | M6 |

### 인력 구성

| 역할 | 인원 |
|---|---|
| 풀스택 개발자 | 1~2명 |
| UI/UX 디자이너 | 0.5명 (파트) |
| 기획/QA | 0.5명 (파트) |

---

## 11. 운영 비용

| 항목 | 월 비용 |
|---|---|
| Vercel (Hobby/Pro) | $0 ~ $20 |
| Railway (BE) | $5 ~ $10 |
| Supabase (Free/Pro) | $0 ~ $25 |
| Cloudflare R2 | < $1 |
| Sentry (Free) | $0 |
| 도메인 | 연 $15 내외 |
| **합계** | **월 $0 ~ 약 $60** |

> 100명 규모, 시즌당 30~50경기 수준은 무료 티어로 운영 가능

---

## 12. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| 기록 입력 UX 부담 | 사용 저조 | 자동저장 + 임시저장 + 단계적 입력 |
| 야구 규칙 오해 (이닝, 자책점) | 데이터 오류 | 입력 가이드 툴팁 + 검증 로직 |
| 매니저/교사 권한 혼란 | 잘못된 확정 | 권한별 버튼 분리 + 확인 모달 |
| 시즌 마감 시 데이터 폐기 사고 | 데이터 손실 | 폐기 전 스냅샷 필수 + 30일 휴지통 |
| 학교 행정 일정 미스매치 | 사용 지연 | 학기 시작 전 출시 권장 |

---

## 13. 확장 로드맵

| 시점 | 기능 |
|---|---|
| v1.1 | 알림 설정, 교체 명단, 팀 랭킹 자격 기준 자동 계산 |
| v1.2 | 경기 실시간 입력, 사진 첨부 |
| v1.3 | 학부모 관전 모드 (읽기 전용) |
| v2.0 | 다중 클럽(여러 학교) 지원, 학교 간 친선전 매칭 |

---

## 부록 A. 용어 정의

| 용어 | 정의 |
|---|---|
| PA | 타석 (Plate Appearances) |
| AB | 타수 (At Bats) |
| H | 안타 (Hits) |
| HR | 홈런 (Home Runs) |
| RBI | 타점 (Runs Batted In) |
| BB | 볼넷 (Base on Balls) |
| HBP | 사구 (Hit By Pitch) |
| SAC | 희생타 (Sacrifice) |
| AVG | 타율 (Batting Average) |
| OBP | 출루율 (On-Base Percentage) |
| SLG | 장타율 (Slugging Percentage) |
| OPS | OBP + SLG |
| IP | 투구 이닝 (Innings Pitched) |
| ER | 자책점 (Earned Runs) |
| ERA | 평균자책점 (Earned Run Average) |
| WHIP | 이닝당 출루 허용 (Walks + Hits per Inning Pitched) |
| K | 탈삼진 (Strikeouts) |

---

## 부록 B. 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|---|---|---|---|
| v1.0 | 2026-06-27 | 최초 작성 | - |

---

**문서 끝**
