// 사용법: node validate.mjs <html 경로>
// HTML 안의 <pre class="mermaid"> 블록을 모두 꺼내 Mermaid 문법을 검사한다.
// 브라우저 없이 동작하며, 의존성(mermaid, jsdom)은 OS 임시 폴더에 한 번만 설치한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const MERMAID_VERSION = '11.4.1'; // index.html의 CDN 버전과 맞춘다
const target = process.argv[2];
if (!target) { console.error('usage: node validate.mjs <html>'); process.exit(2); }

const dir = path.join(os.tmpdir(), `mermaid-validate-${MERMAID_VERSION}`);
if (!fs.existsSync(path.join(dir, 'node_modules', 'jsdom'))) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"mv","private":true}');
  execSync(`npm i mermaid@${MERMAID_VERSION} jsdom@24`, { cwd: dir, stdio: 'ignore' });
}
const require = createRequire(path.join(dir, 'x.js'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><body></body>');
// 플로우차트 파서가 DOMPurify를 통해 DOM 전역을 요구한다
for (const k of ['Element', 'HTMLElement', 'Node', 'DOMParser', 'NodeFilter', 'DocumentFragment', 'HTMLTemplateElement']) {
  globalThis[k] = dom.window[k];
}
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { default: mermaid } = await import(
  pathToFileURL(path.join(dir, 'node_modules/mermaid/dist/mermaid.core.mjs')).href
);

const html = fs.readFileSync(target, 'utf8');
const blocks = [...html.matchAll(/<pre class="mermaid">([\s\S]*?)<\/pre>/g)].map((m) => m[1].trim());
if (!blocks.length) { console.log('다이어그램 블록이 없습니다'); process.exit(1); }
let bad = 0;
for (const [i, b] of blocks.entries()) {
  try { await mermaid.parse(b); console.log(`OK   #${i + 1} ${b.split('\n')[0]}`); }
  catch (e) { bad++; console.log(`FAIL #${i + 1} ${b.split('\n')[0]}\n     ${String(e.message).split('\n').slice(0, 4).join('\n     ')}`); }
}
process.exit(bad ? 1 : 0);
