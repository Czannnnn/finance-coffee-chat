/*
 * gen-rss.mjs — RSS 2.0 피드 생성기 (P1-1 GEO 신디케이션, 수동/CI 실행용)
 *
 * 목적: 순수 정적 HTML 사이트에 RSS 2.0 feed.xml 을 제공해
 *       뉴스/AI 신디케이션·구독 도구가 콘텐츠 변경을 발견하도록 한다.
 *
 * 동작:
 *   1) 루트 sitemap.xml 을 파싱해 <loc>·<lastmod>·<priority> 추출.
 *   2) priority >= MIN_PRIORITY 인 URL 만 item 후보로 선정.
 *   3) cleanUrls(=true) 규칙으로 URL → 로컬 HTML 파일 경로 매핑
 *      ( "/" → index.html, "/tax/isa-guide" → tax/isa-guide.html ).
 *   4) 각 HTML 의 <title>·<meta name="description"> 를 읽어 item title/description 으로.
 *      (파일/태그 누락 시 TITLE_MAP 폴백, 그래도 없으면 해당 item 생략)
 *   5) lastmod(YYYY-MM-DD) → RFC-822 pubDate 변환. lastmod 없으면 item 생략.
 *   6) feed.xml 을 루트에 써냄.
 *
 * 재생성: node scripts/gen-rss.mjs
 *
 * 외부 npm 의존성 없음 — node 내장 모듈(fs/url/path)만 사용.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITEMAP_PATH = join(ROOT, 'sitemap.xml');
const FEED_PATH = join(ROOT, 'feed.xml');
const SITE = 'https://www.financecoffeechat.com';

// priority 임계값 — 이상이면 feed item 후보
const MIN_PRIORITY = 0.7;

const CHANNEL = {
  title: '투자 커피챗',
  link: `${SITE}/`,
  description: '자산관리·공모주·절세·생활비를 가입 없이 바로 쓰는 무료 투자 도구 모음',
  language: 'ko-KR',
};

// 핵심 페이지 폴백 제목 (HTML <title> 파싱 실패 시에만 사용)
const TITLE_MAP = {
  '/': '투자 커피챗 — 자산관리·공모주·절세·생활비 무료 도구',
  '/index-investing': '4대 지수 인덱스 투자 가이드',
  '/tax-optimization': '절세 최적화 가이드',
  '/ipo': '공모주 청약 캘린더',
  '/ipo-analysis': '공모주 분석 — 4대 조건 등급',
  '/asset': '자산관리 101',
  '/portfolio': '포트폴리오 자산배분',
};

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// YYYY-MM-DD → RFC-822 (예: "Mon, 01 Jun 2026 00:00:00 +0900"). 형식 불일치 시 null.
function toRfc822(lastmod) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lastmod || '');
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(dt.getTime())) return null;
  const dow = DAYS[dt.getUTCDay()];
  const mon = MONTHS[dt.getUTCMonth()];
  // KST(+0900) 기준 00:00:00 으로 표기 (사이트 운영 타임존)
  return `${dow}, ${d} ${mon} ${y} 00:00:00 +0900`;
}

// sitemap.xml 파싱 → [{ loc, path, lastmod, priority }]
function parseSitemap(xml) {
  const entries = [];
  const re = /<url>([\s\S]*?)<\/url>/g;
  let block;
  while ((block = re.exec(xml)) !== null) {
    const b = block[1];
    const loc = (b.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1];
    if (!loc) continue;
    const lastmod = (b.match(/<lastmod>([\s\S]*?)<\/lastmod>/) || [])[1] || '';
    const priRaw = (b.match(/<priority>([\s\S]*?)<\/priority>/) || [])[1];
    const priority = priRaw != null ? Number(priRaw) : 0;
    const path = loc.trim().replace(SITE, '') || '/';
    entries.push({ loc: loc.trim(), path, lastmod: lastmod.trim(), priority });
  }
  return entries;
}

// cleanUrls 규칙으로 URL path → 로컬 HTML 파일 경로
function htmlPathFor(urlPath) {
  if (urlPath === '/') return join(ROOT, 'index.html');
  const rel = urlPath.replace(/^\//, '');
  return join(ROOT, `${rel}.html`);
}

// HTML 에서 <title> / <meta name="description"> 추출
function readMeta(filePath) {
  if (!existsSync(filePath)) return { title: '', description: '' };
  const html = readFileSync(filePath, 'utf8');
  const titleRaw = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const descRaw = (html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i) || [])[1] || '';
  return { title: titleRaw.trim(), description: descRaw.trim() };
}

function buildItem(entry) {
  const pubDate = toRfc822(entry.lastmod);
  if (!pubDate) return null; // lastmod 없거나 형식 불일치 → 생략

  const meta = readMeta(htmlPathFor(entry.path));
  const title = meta.title || TITLE_MAP[entry.path] || '';
  if (!title) return null; // 제목 확보 불가 → 생략

  const description = meta.description || title;

  return [
    '    <item>',
    `      <title>${esc(title)}</title>`,
    `      <link>${esc(entry.loc)}</link>`,
    `      <guid isPermaLink="true">${esc(entry.loc)}</guid>`,
    `      <description>${esc(description)}</description>`,
    `      <pubDate>${pubDate}</pubDate>`,
    '    </item>',
  ].join('\n');
}

function main() {
  const xml = readFileSync(SITEMAP_PATH, 'utf8');
  const entries = parseSitemap(xml);

  // priority 내림차순 정렬 → 핵심 페이지 우선, 동률은 lastmod 최신순
  const candidates = entries
    .filter((e) => e.priority >= MIN_PRIORITY)
    .sort((a, b) => (b.priority - a.priority) || b.lastmod.localeCompare(a.lastmod));

  const items = [];
  for (const e of candidates) {
    const item = buildItem(e);
    if (item) items.push(item);
    if (items.length >= 20) break; // RSS item 상한 (15~20)
  }

  const now = toRfc822(new Date().toISOString().slice(0, 10)) || new Date().toUTCString();

  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${esc(CHANNEL.title)}</title>`,
    `    <link>${esc(CHANNEL.link)}</link>`,
    `    <description>${esc(CHANNEL.description)}</description>`,
    `    <language>${CHANNEL.language}</language>`,
    `    <lastBuildDate>${now}</lastBuildDate>`,
    `    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />`,
    items.join('\n'),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  writeFileSync(FEED_PATH, out);
  console.log(`feed.xml 생성 완료: item ${items.length}건 (priority >= ${MIN_PRIORITY} 후보 ${candidates.length}건 중)`);
}

main();
