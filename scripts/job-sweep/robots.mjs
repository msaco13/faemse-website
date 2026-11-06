// robots.txt rules for the weekly job sweep (RFC 9309). The sweep reads a
// page only when its site's robots.txt lets this robot in. Pure functions,
// tested in tests/robots.test.ts.

export const ROBOT = 'FAEMSE-job-sweep';

// Groups of rules, each with the user agents it names and its allow and
// disallow lines, in file order.
export function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const field = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (field === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [], crawlDelay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'allow' || field === 'disallow') current.rules.push({ allow: field === 'allow', path: value });
    else if (field === 'crawl-delay' && Number.isFinite(Number(value))) current.crawlDelay = Number(value);
  }
  return groups;
}

// The rules that apply to a robot: every group naming it (by its product
// token, case ignored), or, if none does, every group for "*".
function rulesFor(groups, robot) {
  const token = robot.toLowerCase();
  const named = groups.filter((g) => g.agents.some((a) => a !== '*' && a === token));
  const chosen = named.length ? named : groups.filter((g) => g.agents.includes('*'));
  return {
    rules: chosen.flatMap((g) => g.rules),
    crawlDelay: chosen.map((g) => g.crawlDelay).find((d) => d !== null) ?? null,
  };
}

// A rule's path as a pattern: "*" matches anything, a final "$" anchors.
function matches(rulePath, path) {
  if (rulePath === '') return false;
  const anchored = rulePath.endsWith('$');
  const body = anchored ? rulePath.slice(0, -1) : rulePath;
  const re = new RegExp('^' + body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : ''));
  return re.test(path);
}

// Whether the robot may read this path (path plus query, e.g. "/jobs?x=1").
// The longest matching rule wins; on a tie, allow wins; no match: allowed.
export function allowed(groups, path, robot = ROBOT) {
  const { rules } = rulesFor(groups, robot);
  let best = null;
  for (const r of rules) {
    if (!matches(r.path, path)) continue;
    const len = r.path.replace(/\$$/, '').length;
    if (!best || len > best.len || (len === best.len && r.allow && !best.allow)) best = { len, allow: r.allow };
  }
  return best ? best.allow : true;
}

export function crawlDelay(groups, robot = ROBOT) {
  return rulesFor(groups, robot).crawlDelay;
}

// What a robots.txt answer means when there is no file to read (RFC 9309
// 2.3.1): missing (4xx) means everything is allowed; a server error or no
// answer means nothing is.
export function verdictForStatus(status) {
  if (status >= 200 && status < 300) return 'read';
  if (status >= 400 && status < 500) return 'allow-all';
  return 'disallow-all';
}
