// Non-mermaid fenced blocks: markdown tables and lists rendered as styled
// images through the same Chromium pipeline. PNG only — the HTML layout does
// not translate to portable standalone SVG.

export type BlockKind = 'mermaid' | 'table' | 'list' | 'card' | 'unknown';

export function fenceKind(lang: string): BlockKind {
  const l = lang.trim().toLowerCase();
  if (l === 'mermaid') return 'mermaid';
  if (l === 'table') return 'table';
  if (l === 'list') return 'list';
  if (l === 'card') return 'card';
  return 'unknown';
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------------------
// markdown table → styled <table>
// ---------------------------------------------------------------------------

export function tableToHtml(src: string): string {
  const rows = src
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|'));
  if (rows.length === 0) throw new Error('table block has no rows');

  const cells = (line: string): string[] => {
    let l = line.trim();
    if (l.startsWith('|')) l = l.slice(1);
    if (l.endsWith('|')) l = l.slice(0, -1);
    return l.split('|').map((c) => c.trim());
  };

  // alignment row: | :--- | ---: |
  let aligns: string[] = [];
  let body = rows;
  if (rows.length >= 2 && /^[\s|:-]+$/.test(rows[1]) && rows[1].includes('-')) {
    aligns = cells(rows[1]).map((c) => {
      const left = c.startsWith(':');
      const right = c.endsWith(':');
      if (left && right) return 'center';
      if (right) return 'right';
      return 'left';
    });
    body = [rows[0], ...rows.slice(2)];
  }

  // r.length on the raw strings would be the LINE LENGTH in UTF-16 units,
  // not the column count — parse to cells first
  const bodyRows = body.map(cells);
  const colCount = Math.max(...bodyRows.map((r) => r.length));
  const [head, ...rest] = [bodyRows[0], ...bodyRows.slice(1)];
  const alignOf = (i: number): string => aligns[i] || 'left';

  const html = (cells: string[], tag: 'th' | 'td'): string =>
    Array.from({ length: colCount }, (_, i) => {
      const v = cells[i] ?? '';
      return `<${tag} style="text-align:${alignOf(i)}">${inline(v)}</${tag}>`;
    }).join('');

  const inline = (s: string): string =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const thead = head ? `<thead><tr>${html(head, 'th')}</tr></thead>` : '';
  const tbody = `<tbody>${rest
    .map((r) => `<tr>${html(r, 'td')}</tr>`)
    .join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

// ---------------------------------------------------------------------------
// markdown list → nested <ul>/<ol>
// ---------------------------------------------------------------------------

interface ListItem {
  depth: number;
  ordered: boolean;
  text: string;
}

export function listToHtml(src: string): string {
  const items: ListItem[] = [];
  for (const raw of src.split('\n')) {
    const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    if (!m) continue;
    items.push({
      depth: Math.floor(m[1].replace(/\t/g, '  ').length / 2),
      ordered: /\d/.test(m[2]),
      text: m[3],
    });
  }
  if (!items.length) throw new Error('list block has no items');

  const inline = (s: string): string =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const build = (start: number, depth: number, ordered: boolean): { html: string; next: number } => {
    let out = ordered ? '<ol>' : '<ul>';
    let i = start;
    while (i < items.length && items[i].depth >= depth) {
      if (items[i].depth > depth) {
        const sub = build(i, items[i].depth, items[i].ordered);
        out = out.replace(/<\/li>$/, `${sub.html}</li>`);
        i = sub.next;
        continue;
      }
      out += `<li>${inline(items[i].text)}</li>`;
      i++;
    }
    return { html: out + (ordered ? '</ol>' : '</ul>'), next: i };
  };

  const { html } = build(0, items[0].depth, items[0].ordered);
  return html;
}

// ---------------------------------------------------------------------------
// card wall: one card per line,  `emoji? | title | description?`
// ---------------------------------------------------------------------------

export function cardToHtml(src: string): string {
  const cards: string[] = [];
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 2) throw new Error('card line must be "icon? | title | description?"');
    let icon = '', title = '', desc = '';
    if (parts.length >= 3) { icon = parts[0]; title = parts[1]; desc = parts.slice(2).join(' | '); }
    else { title = parts[0]; desc = parts[1]; }
    cards.push(
      '<div class="card">' +
      (icon ? `<div class="card-icon">${esc(icon)}</div>` : '') +
      `<div class="card-title">${inlineMd(title)}</div>` +
      (desc ? `<div class="card-desc">${inlineMd(desc)}</div>` : '') +
      '</div>',
    );
  }
  if (!cards.length) throw new Error('card block has no cards');
  return `<div class="cards">${cards.join('')}</div>`;
}

function inlineMd(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// ---------------------------------------------------------------------------
// page shell for block rendering
// ---------------------------------------------------------------------------

const PAGE_CSS = `
:root { color-scheme: light; }
body { margin: 0; background: #ffffff; }
.wrap { display: inline-block; padding: 14px 20px; font-family: "Noto Sans SC", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #1D2129; }
table { border-collapse: separate; border-spacing: 0; width: max-content; font-size: 15px; line-height: 1.55; background: #ffffff; border: 1px solid #E5E6EB; border-radius: 10px; overflow: hidden; }
thead th { white-space: nowrap; }
thead th { background: #F2F3F5; font-weight: 600; }
th, td { padding: 9px 18px; border-bottom: 1px solid #F0F1F3; }
tbody tr:last-child td { border-bottom: none; }
th + th, td + td { border-left: 1px solid #F0F1F3; }
tbody tr:nth-child(even) td { background: #FAFBFC; }
thead tr:nth-child(1) th { background: #F2F3F5; }
code { font-family: "Cascadia Code", Consolas, monospace; font-size: 13.5px; background: #F2F3F5; border-radius: 4px; padding: 1px 5px; }
.cards { display: flex; flex-wrap: wrap; gap: 14px; max-width: 980px; }
.card { width: 296px; box-sizing: border-box; background: #ffffff; border: 1px solid #E5E6EB; border-radius: 10px; padding: 14px 16px 14px 18px; box-shadow: 0 1px 2px rgba(29,33,41,.05); position: relative; }
.card::before { content: ""; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 2px; background: #4098FC; }
.card-icon { font-size: 20px; line-height: 1.2; margin-bottom: 6px; }
.card-title { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
.card-desc { font-size: 13.5px; color: #4E5969; line-height: 1.6; }
.cards code { font-size: 12.5px; }
ul, ol { margin: 0; padding-left: 22px; font-size: 15px; line-height: 1.7; }
ul { list-style: none; padding-left: 4px; }
li { margin: 4px 0; }
li::before { content: "•"; color: #4098FC; font-weight: 700; display: inline-block; width: 18px; }
li ul { padding-left: 22px; }
li ol { padding-left: 22px; }
ol > li::before { content: ""; width: 0; }
strong { font-weight: 600; }
`;

export function blockPage(inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_CSS}</style></head>` +
    `<body><div class="wrap">${inner}</div></body></html>`;
}
