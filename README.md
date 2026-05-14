# WinSpot OMR Marker

한국 로또 6/45 OMR 마킹 용지에 자동으로 번호를 인쇄해 주는 Windows 데스크톱 앱.

조합 번호를 텍스트 파일로 받아 OMR 용지 셀에 정확히 떨어지는 검은 점으로 일괄
인쇄합니다. 5장 한 페이지 (A·B·C·D·E 5게임) 단위로 자동 배치되며, 게임별로
미세 조정이 가능해 다양한 프린터의 정렬 오차를 직접 보정할 수 있습니다.

---

## 주요 기능

- **자동 마킹**: 1~45 번호 조합을 OMR 셀 중심에 정확히 인쇄 (1200 DPI 정수 픽셀)
- **5장 슬립 단위**: 조합 5개를 한 페이지로 자동 묶어 A·B·C·D·E 게임 칸에 배치
- **자동/반자동 체크**: 빈 게임 칸은 자동, 부분 채워진 칸은 반자동으로 표시
- **실측 기반 정렬**: 실제 스캔된 OMR 카드에서 게임별 best-fit 좌표 측정
  (col pitch 3.408~3.421mm, row pitch 6.360~6.384mm — 게임마다 다름)
- **2단계 미세 조정**: 게임 전체 평행 이동 + 게임 내 끝 셀 위치 보정
- **다중 인쇄 누적 오차 차단**: 용지 길이 0.1mm 단위 보정으로 연속 인쇄 시 밀림 방지
- **실시간 미리보기**: 실제 OMR 카드 이미지 위에 마크 위치를 오버레이로 표시

---

## 설치 (사용자)

[Releases](https://github.com/Romeobluesky/mylotto-print-app/releases) 에서 최신 설치
파일 (`WinSpot OMR Marker-Setup-x.x.x.exe`) 을 다운로드해 실행하세요.

- 관리자 권한 불필요 (사용자 폴더에 설치)
- 바탕화면·시작 메뉴 바로가기 자동 생성
- Windows 10/11 x64 지원

---

## 사용 방법

### 1. 조합 파일 준비

텍스트 파일에 한 줄당 6개 번호 (공백/콤마 구분).

```
1 5 12 23 34 41
3 8 15 22 29 38
7 14 21 28 35 42
...
```

### 2. 인쇄 흐름

1. 앱 실행 → **‘파일 열기’** 로 조합 파일 선택
2. 좌측 패널에서 인쇄할 조합 체크 (전체 선택 가능)
3. **‘인쇄 설정’** 에서 프린터 선택 + 시험 인쇄로 위치 확인
4. **‘인쇄’** → 5조합씩 한 페이지로 자동 출력

### 3. 첫 사용 시 정렬 맞추기

OMR 용지 셀과 실제 인쇄 마크가 정확히 일치하도록 한 번만 보정해두면 됩니다.

1. **인쇄 설정** 창에서 **‘시험 인쇄’** 클릭 → 1장 출력
2. 실제 OMR 용지에 검은 점이 셀(타원) 안에 들어갔는지 확인
3. 어긋났다면 다음 표 참고해 설정 조정 → 다시 시험 인쇄
4. 맞으면 **‘저장’** — 이후 모든 인쇄에 자동 적용

| 증상 | 보정 항목 |
|------|-----------|
| 5게임 전체가 같은 방향으로 어긋남 | 전체 마크 위치 보정 |
| 한 게임(A·B·C·D·E 중 하나)만 어긋남 | 각 게임 위치 조정 |
| 첫 번호는 맞는데 끝 번호로 갈수록 어긋남 | 각 게임 간격 미세 조정 |
| 연속 인쇄 시 5장째가 점점 밀림 | 용지 길이 |
| 자동/반자동 표시가 어긋남 | 자동/반자동 표시 위치 |

모든 단위는 **0.1mm** (값 1 = 0.1mm). `+` = 미리보기 기준 오른쪽/아래.

### 4. 두꺼운 종이 뭉치 주의

30장 이상 한꺼번에 트레이에 올리면 픽업 롤러 압력 변동으로 시트마다 위치가
들쭉날쭉할 수 있습니다. **10~15장씩 나눠 인쇄** 를 권장합니다.

---

## 개발

### 환경

- Node.js 20+
- npm 10+
- Windows (빌드 타겟이 win-x64)

### 셋업

```bash
git clone https://github.com/Romeobluesky/mylotto-print-app.git
cd mylotto-print-app
npm install
```

### 명령어

| 명령 | 용도 |
|------|------|
| `npm run dev` | 개발 모드 (HMR + DevTools) |
| `npm run build` | `out/` 에 프로덕션 빌드 (electron 패키징 없음) |
| `npm run dist` | `release/` 에 NSIS 설치파일 (.exe) 생성 — 배포용 |
| `npm run dist:dir` | `release/win-unpacked/` 에 압축 풀린 폴더 — 빠른 테스트용 |
| `npm run typecheck` | TS 타입체크 (web + node) |

### 좌표 재측정

OMR 카드 이미지를 새로 스캔했거나 실측 좌표를 검증하고 싶을 때:

```bash
node scripts/verify-prd.mjs
```

`src/assets/lotto-omr-card.png` (2244×980, 11.811 px/mm) 의 셀 중심을 centroid
기반으로 측정하고 게임별 col/row pitch + 첫 셀 좌표를 출력합니다. 결과값은
[src/types/coordinates.ts](src/types/coordinates.ts) 에 반영.

---

## 기술 스택

- **Electron 31** — 데스크톱 셸 (main + preload + renderer)
- **React 18** + **Vite 5** — UI
- **TypeScript 5** — 전 영역 타입체크
- **Tailwind CSS** + **shadcn/ui** + **Radix UI** — 컴포넌트
- **electron-store** — 설정 영구 저장 (사용자 폴더)
- **electron-builder** + **NSIS** — Windows 설치파일 빌드

---

## 디렉토리 구조

```
electron/             Main process (Node)
  main.ts             진입점 (BrowserWindow, IPC)
  preload.ts          contextBridge 노출 API
  services/
    file-parser.ts    조합 파일 파싱
    print-renderer.ts 1200 DPI 정수 픽셀 SVG 생성 + CCW 90° 회전
    printer.ts        시스템 프린터 enumerate + 인쇄 실행
    store.ts          electron-store 스키마 + 마이그레이션

src/                  Renderer (React)
  components/
    MainWindow.tsx    조합 리스트 + 버튼 패널
    SettingsView.tsx  인쇄 설정 + 미리보기
    MarkOverlay.tsx   미리보기 SVG 오버레이 (마크 위치 시각화)
  types/
    index.ts          AppSettings 외 공유 타입
    coordinates.ts    게임별 best-fit 셀 좌표 + cellPosition 등 헬퍼

resources/            앱 아이콘, OMR 카드 참조 이미지
scripts/              측정 / 검증 스크립트
```

---

## 라이선스

MIT — [LICENSE](LICENSE) 참조
