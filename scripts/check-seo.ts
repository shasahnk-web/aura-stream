// Automated SEO check — runs on build. Fails (exit 1) on missing tags.
// Validates: index.html base tags, SEO component usage on pages, sitemap coverage, JSON-LD validity.
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { globSync } from 'fs';

const errors: string[] = [];
const warnings: string[] = [];

function err(msg: string) { errors.push(msg); }
function warn(msg: string) { warnings.push(msg); }

// 1. index.html base tags
const html = readFileSync(resolve('index.html'), 'utf-8');
const required: Array<[string, RegExp]> = [
  ['<title>', /<title>[^<]{8,}<\/title>/],
  ['meta description', /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{30,}["']/i],
  ['canonical', /<link[^>]+rel=["']canonical["']/i],
  ['og:title', /<meta[^>]+property=["']og:title["']/i],
  ['og:description', /<meta[^>]+property=["']og:description["']/i],
  ['og:type', /<meta[^>]+property=["']og:type["']/i],
  ['og:url', /<meta[^>]+property=["']og:url["']/i],
  ['twitter:card', /<meta[^>]+name=["']twitter:card["']/i],
  ['JSON-LD', /<script[^>]+type=["']application\/ld\+json["']/i],
];
for (const [name, re] of required) {
  if (!re.test(html)) err(`index.html missing ${name}`);
}

// 2. Validate inline JSON-LD blocks
const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
let m: RegExpExecArray | null;
let i = 0;
while ((m = ldRe.exec(html))) {
  i++;
  try {
    const parsed = JSON.parse(m[1].trim());
    if (!parsed['@context'] || !parsed['@type']) err(`JSON-LD block #${i} in index.html missing @context/@type`);
  } catch (e) {
    err(`JSON-LD block #${i} in index.html invalid: ${(e as Error).message}`);
  }
}

// 3. Public pages should render <SEO/>
const PUBLIC_PAGES = [
  'src/pages/Index.tsx',
  'src/pages/SearchPage.tsx',
  'src/pages/TrendingPage.tsx',
  'src/pages/RadioPage.tsx',
  'src/pages/TogetherPage.tsx',
  'src/pages/PlaylistPage.tsx',
  'src/pages/ArtistPage.tsx',
];
for (const p of PUBLIC_PAGES) {
  if (!existsSync(p)) { warn(`Page missing: ${p}`); continue; }
  const src = readFileSync(p, 'utf-8');
  if (!/from ['"]@\/components\/SEO['"]/.test(src) || !/<SEO\b/.test(src)) {
    err(`${p} does not render <SEO/>`);
  }
}

// 4. Sitemap coverage — every static page route should appear in sitemap.xml
const sitemap = existsSync('public/sitemap.xml') ? readFileSync('public/sitemap.xml', 'utf-8') : '';
if (!sitemap) err('public/sitemap.xml missing');
const requiredPaths = ['/', '/search', '/trending', '/radio', '/library', '/liked', '/together'];
for (const p of requiredPaths) {
  // Match <loc>...{p}</loc> — for "/" allow trailing slash only
  const re = p === '/'
    ? /<loc>[^<]+\/<\/loc>/
    : new RegExp(`<loc>[^<]+${p.replace(/\//g, '\\/')}<\\/loc>`);
  if (!re.test(sitemap)) err(`sitemap.xml missing entry for ${p}`);
}

// 5. robots.txt present and not blocking everything
if (!existsSync('public/robots.txt')) {
  warn('public/robots.txt missing');
} else {
  const robots = readFileSync('public/robots.txt', 'utf-8');
  if (/^\s*User-agent:\s*\*\s*[\r\n]+\s*Disallow:\s*\/\s*$/im.test(robots)) {
    err('robots.txt blocks all crawlers (Disallow: /)');
  }
}

// Report
if (warnings.length) {
  console.log('\n⚠ SEO warnings:');
  warnings.forEach(w => console.log('  - ' + w));
}
if (errors.length) {
  console.error('\n✗ SEO check failed:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✓ SEO check passed (${PUBLIC_PAGES.length} pages, ${requiredPaths.length} sitemap routes, ${i} JSON-LD blocks)`);
