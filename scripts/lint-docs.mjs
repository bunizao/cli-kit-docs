// Repo-specific lint for the docs: vocabulary rules, frontmatter, code fences,
// and command/flag drift against the captured command trees in data/.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const problems = [];

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith(".mdx")) pages.push(full);
  }
};
walk(root);

// Vocabulary: no institution names, real-looking unit codes, real hosts, secrets.
const banned = [
  /\bmonash\b/i, /\bdeakin\b/i, /\bunimelb\b/i, /\brmit\b/i, /\bswinburne\b/i,
  /\b(FIT|ATS|ENG|SCI|MAT|ECE|MTH|BUS|ECC|LAW|MED|SIT|COS|SEN|ACC|MGT|IND)\d{4}\b/,
  /learning\.[a-z]+\.edu/i, /moodle\.[a-z]+\.edu\b(?<!example\.edu)/i,
  /MoodleSession=[A-Za-z0-9]{8,}/, /\bsesskey=[A-Za-z0-9]{6,}/,
];
// Implementation detail STYLE.md's "Audience" rule keeps out of user prose. Checked outside
// code fences and MDX comments, and not on generated reference pages.
const internals = [
  /service\.php/i, /\bsesskey\b/i, /\bDurable Object/i, /\bCommander\b/, /JSON-RPC/i, /@bunizao\/cli-kit/,
  /problem\+json/i, /RFC ?9457/i, /\bAES(-\d+)?(-GCM)?\b/, /\bkeyId\b/, /intent contract/i, /\bthe resolver\b/i,
  /\bWrangler\b/, /\bzod\b/i, /\bMCP-(Method|Name|Protocol-Version)\b/,
];
// Words STYLE.md forbids in prose.
const filler = [/\bsimply\b/i, /\bseamless(ly)?\b/i, /\bpowerful\b/i, /\brobust\b/i, /\bcutting-edge\b/i, /\bin order to\b/i, /it is important to note/i, /\beasily\b/i];

// Load command trees for drift checks.
const trees = {};
for (const cli of ["moodle", "edstem", "ontrack"]) {
  trees[cli] = JSON.parse(readFileSync(join(root, "data", `${cli}.commands.json`), "utf8"));
}
const flagSet = (node, acc = new Set()) => {
  for (const o of node.options ?? []) for (const f of o.flags.split(/,\s*/)) acc.add(f.trim().split(/[ =<]/)[0]);
  for (const c of node.commands ?? []) flagSet(c, acc);
  return acc;
};
const knownFlags = Object.fromEntries(Object.entries(trees).map(([k, t]) => [k, flagSet(t)]));
const topLevel = Object.fromEntries(Object.entries(trees).map(([k, t]) => {
  const names = new Set();
  for (const c of t.commands) { names.add(c.name); for (const a of c.aliases ?? []) names.add(a); }
  return [k, names];
}));
// Global flags that every CLI accepts but that may not be on every node.
const globalFlags = new Set(["--json", "--yaml", "--table", "--fields", "-o", "--output", "-v", "--verbose", "--no-color", "-y", "--yes", "--dry-run", "-h", "--help", "-V", "--version", "--no-cache", "--pretty", "--limit", "--days", "--quiet", "-q"]);

for (const file of pages) {
  const rel = relative(root, file);
  const text = readFileSync(file, "utf8");
  const report = (msg, line) => problems.push(`${rel}${line ? ":" + line : ""}: ${msg}`);

  if (!/^---\n(?:[\s\S]*?\n)?title:/.test(text)) report("missing frontmatter title");
  if (!/^---\n(?:[\s\S]*?\n)?description:/.test(text)) report("missing frontmatter description");

  const lines = text.split("\n");
  const isReference = rel.includes("/reference/");
  // Developer pages may name mechanisms; user pages may not.
  const isDeveloper = rel.startsWith("developers/") || rel.startsWith("concepts/") || rel.startsWith("agents/")
    || ["mcp/how-it-works.mdx", "mcp/security.mdx", "mcp/tools/moodle.mdx", "mcp/tools/edstem.mdx"].includes(rel);
  let inFence = false;
  lines.forEach((line, i) => {
    const n = i + 1;
    const fence = line.match(/^\s*```(\w*)/);
    if (fence) {
      if (!inFence && fence[1] === "") report("code fence without a language tag", n);
      inFence = !inFence;
    }
    for (const re of banned) if (re.test(line)) report(`vocabulary violation: ${re}`, n);
    if (!inFence) for (const re of filler) if (re.test(line)) report(`filler/marketing word: ${re}`, n);
    if (!inFence && !isReference && !isDeveloper && !line.includes("{/*")) for (const re of internals) if (re.test(line)) report(`implementation detail in user prose: ${re}`, n);
  });

  // Drift: bash code blocks must use real top-level commands and real flags.
  const fences = [...text.matchAll(/```(bash|sh|shell|zsh)\n([\s\S]*?)```/g)];
  for (const m of fences) {
    const block = m[2];
    const lineNo = text.slice(0, m.index).split("\n").length;
    for (const raw of block.split("\n")) {
      const cmdLine = raw.replace(/#.*$/, "").trim();
      const head = cmdLine.match(/^(?:\$ )?(?:[A-Z_]+=\S+\s+)*(?:env\s+\S+\s+)?(moodle|edstem|ontrack)\s+(\S+)?/);
      if (!head) continue;
      const cli = head[1];
      const first = head[2];
      if (first && !first.startsWith("-") && !first.startsWith("'") && !first.startsWith('"') && !first.startsWith("http") && cli !== "moodle" && !topLevel[cli].has(first)) {
        report(`unknown ${cli} command '${first}'`, lineNo);
      }
      if (first && cli === "moodle" && !first.startsWith("-") && !topLevel[cli].has(first) && !/^(UNIT|'|"|http|\$|<)/.test(first)) {
        report(`unknown moodle command '${first}' (porcelain targets must be UNIT, a quoted phrase or a URL)`, lineNo);
      }
      for (const f of cmdLine.match(/(?:^|\s)(--?[a-z][\w-]*)/g) ?? []) {
        const flag = f.trim();
        if (globalFlags.has(flag)) continue;
        if (!knownFlags[cli].has(flag)) report(`unknown ${cli} flag '${flag}'`, lineNo);
      }
    }
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`lint ok: ${pages.length} pages`);
