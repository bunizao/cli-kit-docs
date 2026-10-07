# Writing guide for this docs site

Every page on this site is read by students, teaching staff, script authors and AI agents.
Assume the reader is competent and busy. These rules are not optional.

## Ground truth

- Document the released versions only: moodle-cli 0.9.2, edstem-cli 0.7.0, ontrack 0.3.2, @bunizao/cli-kit 0.5.0.
- unicorn has no release number or captured data. Its pages follow the source repository at commit e8a3559 (migrations through 0016). Check every name, flag, setting and limit against that source.
- The captured command trees (`data/*.commands.json`), the captured `--help` text for every command
  (`data/*.help-all.txt`) and the MCP tool catalogs (`data/*.mcp-tools.json`) are authoritative.
  Real course examples in captures are replaced with placeholders. When an upstream README disagrees
  with the captured release, the captured output wins.
- Every command, flag, argument, environment variable, file path, exit code and default you write must exist in
  those files or in the corresponding tagged upstream source linked from README.md. Do not invent flags.
  Do not describe behaviour you did not verify in source.
- When behaviour is uncertain, leave a `{/* TODO: verify ... */}` comment and say so in your report. Never guess.

## Audience (hard requirement)

Write for the person **using** the tool, never for the person building it. The reader is a student checking a
deadline, a tutor triaging a unit, someone wiring an agent up, or a script author. They will never open the source.

Test every sentence: does the reader need this to install, sign in, run a command, read a result, fix an error,
or decide whether to trust the tool? If not, delete it.

Never in user-facing prose:

- Internal URLs, endpoints and page paths the tool calls (`/lib/ajax/service.php`, `/my/`, `/mcp`, `/oauth/register`).
- Internal identifiers and wire details: `sesskey`, `userid`, header names, JSON-RPC, protocol version strings,
  Moodle error strings such as `servicerequireslogin`, `invalidrecord`.
- Libraries, packages and frameworks (Commander, `@bunizao/cli-kit`, Wrangler, zod), source or module names.
- Architecture nouns: Durable Object, resolver, connector, receipt, intent contract, envelope, adapter, core.
- Cryptographic detail (AES-GCM, IV, key ids, digests). Say "encrypted" or "stored in your OS keychain".
- Timing and size internals (an 8-second read, a 5-minute cache, a 20-client cap) unless the number changes what the
  reader does.
- "cli-kit" as a framework the reader must know about. Say "all three tools" or "every command".

Keep the fact, drop the mechanism. "Your session is stored encrypted and only your own account can be used" beats
"the Durable Object holds an AES-GCM envelope keyed by profile". The one exception is `mcp/how-it-works.mdx`, which
may describe the architecture in plain language for someone deciding whether to trust it, still without code-level
names.

The cookie name `MoodleSession` may appear only where the reader has to copy it by hand (`--paste`).

## Vocabulary rules (hard requirement)

- Never write a real unit code, unit name, institution name, site hostname, lecturer name or student name.
  Use `UNIT`, `TASK`, `SECTION`, `https://moodle.example.edu`, `https://ontrack.example.edu`, `Unit A`.
  The upstream READMEs contain a few real codes; do not copy them.
- Never show a real cookie, token, sesskey or key. Use `<your-token>`.
- Never state or imply that unit codes follow a pattern (letters plus digits). The tools resolve references
  against the site's own unit list.

## Voice (Write the Docs + Mintlify)

- Second person, active voice, present tense. Sentence-case headings.
- Lead with the outcome. State what a thing is before how to use it. Put prerequisites first in procedures.
- One idea per sentence. Short paragraphs. No filler ("in order to", "it is important to note"), no marketing
  adjectives, no "simply", "just", "easily", no emoji, no decorative bold.
- Explain why when a rule is surprising (why `chats read` needs `--yes`, why `--final` cannot be undone).
- Prefer one good example over three variations. Examples use placeholders from the vocabulary rules.
- Every code block has a language tag: `bash`, `json`, `yaml`, `toml`, `text`.
- Do not end pages with summaries or "next steps" prose; use `<Card>` links only when they help navigation.

## Mintlify conventions

- Frontmatter: `title` (sentence case), `description` (one sentence), optional `sidebarTitle`, `icon`.
- Internal links are root-relative without extension: `/moodle/sign-in`, `/mcp/clients/claude-code`.
- Components available without import: `<Note>`, `<Info>`, `<Tip>`, `<Warning>`, `<Check>`, `<Steps>`/`<Step>`,
  `<Tabs>`/`<Tab>`, `<CodeGroup>`, `<Accordion>`/`<AccordionGroup>`, `<Card>`/`<Columns>`, `<ParamField>`,
  `<ResponseField>`, `<Expandable>`, `<Icon>`. Use them sparingly and only where they aid scanning.
- Inside MDX, a literal `{` or `<` in prose must be escaped or placed in code. Angle-bracket placeholders like
  `<unit>` go inside backticks.
- Tables are GitHub Markdown tables.

## Page shape

1. One-sentence description of what the page lets the reader do.
2. Prerequisites, if any.
3. The task, as commands with short explanations.
4. What the output means, including the JSON envelope keys an agent will see.
5. Failure modes with the exact error code and the fix.

## Reference pages

`*/reference/*.mdx` are generated by `scripts/generate-reference.mjs` from the captured command trees.
Never edit them by hand. The exception is `unicorn/reference/tools.mdx`, which is written by hand because unicorn has no captured command tree. Prose pages link to them for exact syntax.
