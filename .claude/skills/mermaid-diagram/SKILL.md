---
name: mermaid-diagram
description: src/ 디렉토리를 분석해 컴포넌트 의존성·상태 흐름을 Mermaid 다이어그램으로 시각화한 단일 HTML(docs/architecture/index.html)을 생성하고 브라우저로 바로 띄운다. "Mermaid 다이어그램", "아키텍처 다이어그램", "의존성 시각화" 요청 시 사용.
---

# mermaid-diagram

`src/`를 분석해 Mermaid 다이어그램 HTML을 만들고 브라우저에서 연다.

## 절차

1. **분석** — `src/` 전체 파일을 읽는다 (`main.tsx`, `App.tsx`, `components/*`, `context/*`, `api/*`, `types/*`). 각 파일의 `import`와 props, 상태(`useState`/Context)를 파악한다. 추측하지 말고 코드에 있는 것만 그린다.
2. **생성** — 결과를 `docs/architecture/index.html` 한 파일로 저장한다 (디렉토리가 없으면 생성).
3. **실행** — 아래 "브라우저 열기"로 바로 띄운다.
4. 완료 후 저장 경로와 포함된 다이어그램 목록을 짧게 보고한다.

## 우선순위

1. **컴포넌트 간 의존성 관계 (가장 중요)** — import 그래프(`flowchart TD`), subgraph로 계층(진입점/컴포넌트/상태/API/타입/외부 서버) 구분, `classDef`로 계층별 색상.
2. 컴포넌트 트리 & props — 렌더 관계, slot prop, `useNotes()` 구독을 점선으로.
3. 상태 소유 & 데이터 흐름 — 서버 상태(Context) / UI 상태(App) / 폼 상태(로컬)를 구분하고, 데이터는 아래로, 이벤트는 위로 흐르게 표현.
4. 시퀀스 다이어그램 — 초기 로딩, 저장, 삭제 등 주요 플로우.
5. 상태 머신 — UI 상태 전이가 있으면 `stateDiagram-v2`.
6. 파일별 책임 요약 표.

## HTML 규칙

- 단일 파일, Mermaid는 CDN ESM으로 로드 (버전 고정, 예: `mermaid@11.4.1`):
  `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs'`
- `startOnLoad: false` + `await mermaid.run({ querySelector: '.mermaid' })`. 다이어그램은 `<pre class="mermaid">`에 넣는다.
- 라이트/다크 모드 대응 (`prefers-color-scheme`으로 Mermaid theme과 CSS 변수 전환).
- 한국어 UI. 각 다이어그램에 제목과 한 줄 설명을 붙인다.
- Mermaid 문법 주의: 노드 라벨의 특수문자/괄호는 `"..."`로 감싼다, 줄바꿈은 `<br/>`, 엣지 라벨도 `"..."`.

## 브라우저 열기

프로젝트가 WSL2에서 돌 수 있으므로 환경에 맞게 선택한다. 파일 경로는 절대경로로 쓴다.

```bash
FILE="$(pwd)/docs/architecture/index.html"   # 프로젝트 루트 기준
if grep -qi microsoft /proc/version 2>/dev/null; then
  # WSL: Windows 기본 브라우저로 열기
  explorer.exe "$(wslpath -w "$FILE")" || cmd.exe /c start "" "$(wslpath -w "$FILE")"
elif command -v xdg-open >/dev/null; then
  xdg-open "$FILE"            # Linux
elif command -v open >/dev/null; then
  open "$FILE"                # macOS
else
  echo "수동으로 여세요: file://$FILE"
fi
```

참고: `explorer.exe`는 성공해도 종료 코드가 1일 수 있으니 코드로 실패를 판단하지 않는다. CDN 로드가 필요하므로 인터넷 연결이 있어야 렌더링된다.
