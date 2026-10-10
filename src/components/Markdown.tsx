import { Fragment, type ReactNode } from 'react';

// A small Markdown renderer for the board's hub documents (src/lib/hubs.ts).
// It covers what the drafts use and nothing more: paragraphs, "-" and "1."
// lists (including "- [ ]" checklists), pipe tables, "> " quotes, "####"
// headings, and inline **bold**, *italic*, [links](url) and backslash
// escapes. Output is React elements, never injected HTML, and only http(s)
// and mailto links become links.

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul' | 'ol'; items: { text: string; task: boolean }[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'quote'; body: string };

const ITEM = /^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/;

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t || /^<!--.*-->$/.test(t)) {
      i++;
      continue;
    }
    if (/^#{1,6}\s/.test(t)) {
      blocks.push({ kind: 'h', text: t.replace(/^#+\s+/, '') });
      i++;
      continue;
    }
    if (t.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) body.push(lines[i++].trim().replace(/^>\s?/, ''));
      blocks.push({ kind: 'quote', body: body.join('\n') });
      continue;
    }
    if (t.startsWith('|') && i + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[i + 1].trim()) && lines[i + 1].includes('-')) {
      const head = cells(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      blocks.push({ kind: 'table', head, rows });
      continue;
    }
    const first = ITEM.exec(line);
    if (first) {
      const kind = first[2] ? 'ul' : 'ol';
      const items: { text: string; task: boolean }[] = [];
      while (i < lines.length) {
        const m = ITEM.exec(lines[i]);
        if (m && (m[2] ? 'ul' : 'ol') === kind && m[1].length < 2) {
          const task = /^\[[ xX]\]\s+/.test(m[4]);
          items.push({ text: m[4].replace(/^\[[ xX]\]\s+/, ''), task });
          i++;
          continue;
        }
        // An indented line continues the current item.
        if (items.length && /^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1].text += ' ' + lines[i].trim();
          i++;
          continue;
        }
        // Loose lists put a blank line between items; keep going if the next
        // non-blank line is another item of the same list.
        if (!lines[i].trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          const next = j < lines.length ? ITEM.exec(lines[j]) : null;
          if (next && (next[2] ? 'ul' : 'ol') === kind && next[1].length < 2) {
            i = j;
            continue;
          }
        }
        break;
      }
      blocks.push({ kind, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !ITEM.exec(lines[i]) && !/^(#{1,6}\s|>|\|)/.test(lines[i].trim())) para.push(lines[i++].trim());
    blocks.push({ kind: 'p', text: para.join(' ') });
  }
  return blocks;
}

const INLINE = /\\([\\`*_{}[\]()#+\-.!$|<>"'])|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*(?!\s)(.+?)\*/g;

function safeHref(url: string): string | null {
  return /^(https?:|mailto:)/i.test(url) ? url : null;
}

function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${n++}`;
    if (m[1] !== undefined) out.push(m[1]);
    else if (m[2] !== undefined) {
      const href = safeHref(m[3]);
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-brand-blue font-semibold underline decoration-brand-blue/30 underline-offset-2 hover:decoration-brand-blue">
            {inline(m[2], k)}
          </a>
        ) : (
          <Fragment key={k}>{inline(m[2], k)}</Fragment>
        ),
      );
    } else if (m[4] !== undefined) out.push(<strong key={k}>{inline(m[4], k)}</strong>);
    else if (m[5] !== undefined) out.push(<em key={k}>{inline(m[5], k)}</em>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// "Go to the source" lines close every subsection in the drafts; set them
// apart so the citation trail is easy to find.
function isSourceLine(text: string): boolean {
  return /^\*{1,2}Go to the source:?/i.test(text);
}

export default function Markdown({ source }: { source: string }) {
  const blocks = parse(source);
  return (
    <div className="text-[15.5px] leading-relaxed text-body space-y-4">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.kind) {
          case 'h':
            return (
              <h3 key={k} className="font-bold text-lg pt-2">
                {inline(b.text, k)}
              </h3>
            );
          case 'p':
            return isSourceLine(b.text) ? (
              <p key={k} className="text-[14px] text-muted border-l-[3px] border-brand-gold/70 bg-paper rounded-r-lg px-4 py-3">
                {inline(b.text, k)}
              </p>
            ) : (
              <p key={k}>{inline(b.text, k)}</p>
            );
          case 'quote':
            return (
              <blockquote key={k} className="border-l-[3px] border-brand-blue bg-[#EEF3FD] rounded-r-lg px-4 py-3">
                <Markdown source={b.body} />
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={k} className={b.items.every((it) => it.task) ? 'space-y-2' : 'list-disc pl-6 space-y-2'}>
                {b.items.map((it, j) =>
                  it.task ? (
                    <li key={j} className="flex gap-2.5">
                      <span aria-hidden className="mt-[5px] w-4 h-4 flex-none rounded border-[1.5px] border-muted/60" />
                      <span>{inline(it.text, `${k}-${j}`)}</span>
                    </li>
                  ) : (
                    <li key={j}>{inline(it.text, `${k}-${j}`)}</li>
                  ),
                )}
              </ul>
            );
          case 'ol':
            return (
              <ol key={k} className="list-decimal pl-6 space-y-2">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it.text, `${k}-${j}`)}</li>
                ))}
              </ol>
            );
          case 'table':
            return (
              <div key={k} className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-[14px] border-collapse">
                  <thead className="bg-paper text-left">
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j} scope="col" className="px-3.5 py-2.5 font-bold border-b border-line align-bottom">
                          {inline(h, `${k}-h${j}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-b border-line last:border-b-0 align-top">
                        {r.map((c, x) => (
                          <td key={x} className="px-3.5 py-2.5 min-w-[9rem]">
                            {inline(c, `${k}-${j}-${x}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
