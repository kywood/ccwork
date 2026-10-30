# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 목적

React 19 + TypeScript + Vite 기반 **노트 앱 실습/강의용 프로젝트**. 제목·내용을 가진 노트의 CRUD를 제공하는 작은 SPA이며, 백엔드는 `json-server`(`db.json`)가 대신한다. 강의 중 기능을 점진적으로 추가하는 용도로 설계되어 있다 (예: `src/types/note.ts`에 "tags 필드는 아직 없음 — 강의에서 추가할 것" 주석). UI 문구와 주석은 한국어.

## 명령어

```bash
npm install
npm run dev          # vite(5173) + json-server(3001)를 concurrently로 동시 실행
npm run server       # json-server만 실행 (db.json watch, port 3001)
npm run build        # tsc && vite build (타입 체크 포함)
npm run lint         # eslint . --fix  (자동 수정 포함)
npm run format       # prettier --write .
npm test             # vitest run (1회 실행)
npm run test:watch   # vitest watch
npx vitest run src/path/to/file.test.tsx            # 단일 테스트 파일
npx vitest run -t "테스트 이름"                      # 이름으로 필터
```

- 앱: http://localhost:5173 / API: http://localhost:3001/notes
- 현재 테스트 파일은 없다. 환경만 구성됨 (vitest + jsdom + Testing Library, `globals: true`, setup: `src/test-setup.ts`가 `@testing-library/jest-dom` 로드). 테스트 설정은 `vite.config.ts`의 `test` 블록에 있다.
- API가 `localhost:3001`에 떠 있어야 앱이 동작한다. 컴포넌트 테스트 시 `src/api/notes`를 mock해야 한다.

## 아키텍처

```
src/
├── main.tsx            # StrictMode + createRoot, index.css 로드
├── App.tsx             # UI 선택 상태 + NotesProvider로 Layout 조립
├── api/notes.ts        # json-server fetch 래퍼 (유일한 네트워크 접점)
├── context/NotesContext.tsx  # 서버 데이터 상태 + CRUD (useNotes 훅)
├── components/         # Layout, NoteList, NoteItem, NoteEditor
└── types/note.ts       # Note 인터페이스
```

### 상태 분리 (핵심 구조)

- **서버/도메인 상태** → `NotesContext`: `notes`, `loading`, `error`, `addNote`/`editNote`/`removeNote`. 마운트 시 한 번 `fetchNotes()`. 각 mutation은 **API 호출 성공 후** 서버 응답으로 로컬 state를 갱신한다 (낙관적 업데이트 아님). 에러는 throw하므로 호출 측(`NoteEditor.handleSave`)이 try/catch로 처리한다.
- **UI 상태** → `App.tsx`의 `selectedNoteId`, `isCreating`. `NotesProvider`의 부모인 `App`에서 관리하며 props로 `NoteList`/`NoteEditor`에 내려보낸다. (`isCreating`이 true이면 `selectedNoteId`는 null — 두 값은 상호 배타적으로 유지)
- `Layout`은 `sidebar`/`main`을 ReactNode slot prop으로 받는 순수 레이아웃 컴포넌트.
- `NoteEditor`는 로컬 `title`/`content` 폼 state를 가지며, `useEffect([selectedNoteId, isCreating])`로 선택된 노트와 동기화한다 (`exhaustive-deps` 의도적 disable).

### API 계층

- `API_URL`이 `src/api/notes.ts`에 `http://localhost:3001`로 하드코딩.
- `createdAt`/`updatedAt`은 **클라이언트가** ISO 문자열로 채운다 (`createNote`는 둘 다, `updateNote`는 PATCH 시 `updatedAt`). `id`는 json-server가 생성(문자열).
- 새 필드 추가 시: `types/note.ts` → `api/notes.ts`(`createNote`의 `Omit` 타입 포함) → `NotesContext` 시그니처 → 컴포넌트 순으로 전파된다.

## 구현 패턴

### 컴포넌트
- 함수형 컴포넌트 + named export (`App`만 default). 파일당 컴포넌트 1개, 파일명 = 컴포넌트명.
- Props는 파일 상단 `interface XxxProps`로 정의하고 시그니처에서 구조분해한다.
- 상위가 상태를 갖고 하위는 props 콜백으로 통지한다 (`onSelect`, `onDelete`, `onDone`, `onNewNote`). 하위가 상위 상태를 직접 바꾸지 않는다.
- 레이아웃 컴포넌트는 `sidebar`/`main`처럼 ReactNode slot prop으로 자식을 받는다.
- 데이터 의존 컴포넌트(`NoteList`)는 `loading` → `error` → 빈 목록 순으로 early return 후 본 렌더.
- `NoteItem`의 삭제 버튼은 `e.stopPropagation()`으로 카드 클릭(선택)과 이벤트를 분리한다.
- 폼 컴포넌트(`NoteEditor`)는 로컬 `title`/`content`/`saving` state를 두고 `useEffect`로 선택 노트와 동기화한다. 제출 중 `saving`으로 버튼 비활성화, `try/catch/finally`로 처리.
- 사용자 알림은 `alert()`(검증/저장 실패), 삭제는 확인 없이 즉시 실행.

### 상태 관리
- 전역 라이브러리 없이 **React Context + useState**만 사용한다. 서버 데이터는 Context, 화면 선택 상태는 `App`의 로컬 state.
- Context는 `createContext<T | null>(null)` + 커스텀 훅 `useNotes()`에서 null이면 throw하는 패턴. Provider 밖 사용 불가.
- mutation은 `await api.xxx()` 성공 후 `setNotes`의 함수형 업데이트(`prev => ...`)로 반영 (추가: append, 수정: map 교체, 삭제: filter). 낙관적 업데이트·재조회 없음.
- 에러 처리 분담: 초기 로딩 에러는 Context가 `error` state로 보관, mutation 에러는 throw하여 호출 컴포넌트가 처리.
- 파생 값은 state로 두지 않고 렌더 중 계산 (`notes.find(...)`로 `selectedNote`).

### API 호출
- 모든 fetch는 `src/api/notes.ts`에만 둔다. 컴포넌트는 직접 호출하지 않고 Context를 통해서만 접근 (`import * as api`).
- 함수당 엔드포인트 1개, 반환 타입을 명시한 `async` 함수 (`Promise<Note[]>`, `Promise<Note>`, `Promise<void>`).
- 공통 패턴: `fetch` → `if (!res.ok) throw new Error('Failed to ...')` → `res.json()`. 별도 에러 클래스·axios 없음.
- 쓰기 요청은 `Content-Type: application/json` + `JSON.stringify`. 수정은 `PATCH`(`Partial<Note>`), 타임스탬프는 함수 내부에서 주입.
- 입력 타입은 서버/함수가 채우는 필드를 `Omit<Note, 'id' | 'createdAt' | 'updatedAt'>`로 제외한다.

## 네이밍 규칙

| 대상 | 규칙 | 예 |
|------|------|----|
| 컴포넌트 / 파일 | PascalCase, 파일명 일치 | `NoteList.tsx` |
| Props 타입 | `<컴포넌트>Props` | `NoteItemProps` |
| Context / Provider / 타입 | `<도메인>Context`, `<도메인>Provider`, `<도메인>ContextType` | `NotesContext` |
| 훅 | `use` + 도메인(복수) | `useNotes` |
| API 함수 | CRUD 동사 + 대상 | `fetchNotes`, `createNote`, `updateNote`, `deleteNote` |
| Context 액션 | `add`/`edit`/`remove` + `Note` (API 동사와 구분) | `addNote`, `editNote`, `removeNote` |
| props 콜백 | `on` + 동작 | `onSelect`, `onDone`, `onNewNote` |
| 내부 핸들러 | `handle` + 동작 | `handleSave`, `handleSelectNote` |
| state / setter | 명사 + `set` + 명사 | `[title, setTitle]` |
| boolean | `is` + 형용사 (`isSelected`, `isCreating`); 진행 상태는 현재분사/명사 (`loading`, `saving`) | |
| 상수 | UPPER_SNAKE_CASE | `API_URL` |
| 비컴포넌트 폴더/파일 | 폴더는 소문자, API 파일은 복수형, 타입 파일은 단수형 | `api/notes.ts`, `types/note.ts` |

## 스타일 / 툴링

- **Tailwind CSS v4** (`@tailwindcss/vite`, `tailwind.config` 없음). 디자인 토큰은 `src/index.css`의 `@theme`(`background`, `card`, `foreground`, `muted`, `muted-foreground`, `border`, `destructive`)에 정의하고 `bg-card`, `text-muted-foreground` 같은 시맨틱 유틸리티로 사용한다. 하드코딩 색상 대신 이 토큰을 쓴다.
- Prettier: 세미콜론, 작은따옴표, 2칸, trailing comma `all`, printWidth 100.
- TypeScript `strict` + `noUnusedLocals`/`noUnusedParameters`. ESLint: typescript-eslint + react-hooks + react-refresh(`only-export-components` warn).

## 주의사항

- `db.json`은 json-server가 런타임에 **직접 수정**한다 (개발 중 CRUD가 곧 파일 변경). 의도치 않은 데이터 변경이 커밋되지 않도록 주의.
- `npm run lint`는 `--fix`라서 파일을 수정한다.
- Git remote: `git@github.com:frongt/ccwork.git`
