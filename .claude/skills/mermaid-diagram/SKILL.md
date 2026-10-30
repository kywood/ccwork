---
name: mermaid-diagram
description: src/ 디렉토리를 분석해 컴포넌트 의존성·상태 흐름을 Mermaid 다이어그램으로 시각화한 단일 HTML(docs/architecture/index.html)을 생성하고 문법을 검증한 뒤 브라우저로 바로 띄운다. 사용자가 Mermaid, 다이어그램, 아키텍처 그림, 의존성 시각화, 컴포넌트 관계도, 상태 흐름도, 코드 구조 그려달라고 하면 "Mermaid"라고 명시하지 않아도 반드시 이 스킬을 사용한다. 이미 만든 다이어그램을 코드 변경에 맞춰 갱신할 때도 사용한다.
---

# mermaid-diagram

`src/`를 분석해 Mermaid 다이어그램 HTML을 만들고, 문법을 검증한 뒤 브라우저에서 연다.
사용자는 결과를 브라우저에서 직접 보며 코드 구조를 이해하려는 것이므로, **그림이 실제로 렌더링되는 것**이 성공 기준이다.

## 절차

1. **분석** — `src/` 전체 파일을 읽는다 (`main.tsx`, `App.tsx`, `components/*`, `context/*`, `api/*`, `types/*` 등 실제 존재하는 파일 기준). 각 파일의 `import`, props, 상태(`useState`/Context)를 파악한다. 다이어그램이 코드와 어긋나면 오히려 오해를 만들기 때문에, 코드에 있는 것만 그리고 추측은 넣지 않는다.
2. **생성** — `docs/architecture/index.html` 한 파일로 저장한다 (디렉토리가 없으면 생성). 이미 있으면 현재 코드에 맞게 덮어써 갱신한다.
3. **검증** — 아래 "검증" 절의 스크립트를 실행한다. FAIL이 있으면 해당 블록을 고치고 모두 OK가 될 때까지 반복한다. 문법 오류가 있으면 브라우저에서 그 다이어그램만 에러 박스로 보이기 때문에, 열기 전에 잡는 편이 훨씬 싸다.
4. **실행** — 아래 "브라우저 열기"로 바로 띄운다.
5. **보고** — 저장 경로, 포함된 다이어그램 목록, 검증 결과를 짧게 알린다. 렌더링을 눈으로 확인하지 못했다면 그렇게 말한다.

## 다이어그램 우선순위

1. **컴포넌트 간 의존성 관계 (가장 중요)** — import 그래프(`flowchart TD`). 계층(진입점/컴포넌트/상태/API/타입/외부 서버)을 subgraph로 묶고 `classDef`로 계층별 색을 준다. 외부 서버는 `[( )]` 실린더로.
2. 컴포넌트 트리와 props — 렌더 관계는 실선, 전달 props·Context 구독은 점선 + 라벨.
3. 상태 소유와 데이터 흐름 — 서버 상태(Context) / UI 상태(상위 컴포넌트) / 폼 상태(로컬)를 구분하고, 데이터는 아래로·이벤트는 위로 흐르게 그린다.
4. 시퀀스 다이어그램 — 초기 로딩, 저장, 삭제 등 주요 플로우. `rect`로 구간을 나누면 읽기 쉽다.
5. 상태 머신 — UI 상태 전이가 있으면 `stateDiagram-v2`.
6. 파일별 책임 요약 표.

프로젝트에 해당 요소가 없으면(예: Context 없음) 그 다이어그램은 빼고, 있는 구조에 맞게 조정한다.

## HTML 규칙

- 단일 파일. Mermaid는 CDN ESM으로 로드하고 버전을 고정한다 (`mermaid@11.4.1`). 버전을 고정해야 검증 스크립트와 브라우저의 파서가 같아진다.
  `import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs'`
- `startOnLoad: false` + `await mermaid.run({ querySelector: '.mermaid' })`. 다이어그램은 `<pre class="mermaid">`에 넣는다 (검증 스크립트가 이 형태를 찾는다).
- `prefers-color-scheme`에 맞춰 CSS 변수와 Mermaid theme을 라이트/다크로 전환한다.
- UI는 한국어. 각 다이어그램에 제목과 한 줄 설명을 붙인다.
- 문법 주의: 특수문자·괄호·콜론이 든 노드/엣지 라벨은 `"..."`로 감싼다, 줄바꿈은 `<br/>`. 노드 id에 예약어(`end` 등)를 쓰지 않는다.

## 검증

```bash
node .claude/skills/mermaid-diagram/scripts/validate.mjs docs/architecture/index.html
```

`<pre class="mermaid">` 블록마다 `mermaid.parse()`를 돌려 `OK`/`FAIL`을 출력하고, 실패가 있으면 종료 코드 1을 반환한다. 브라우저가 필요 없다. 첫 실행 시 mermaid·jsdom을 OS 임시 폴더에 설치하므로 인터넷이 필요하고 수십 초 걸린다. 문법만 검사하므로 레이아웃·가독성은 브라우저에서 확인해야 한다.

## 브라우저 열기

프로젝트가 WSL2에서 돌 수 있으므로 환경에 맞게 고른다. 경로는 절대경로로 쓴다.

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

`explorer.exe`는 성공해도 종료 코드가 1일 수 있으니 종료 코드로 실패를 판단하지 않는다. CDN 로드가 필요하므로 인터넷이 있어야 렌더링된다.
