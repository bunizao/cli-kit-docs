# Contributing

Use Node.js 22 LTS, install dependencies with `npm ci`, and read [STYLE.md](STYLE.md) before editing pages.

## Edit documentation

1. Make a branch for the change.
2. Edit the relevant MDX page. Add new pages to `docs.json` navigation.
3. Preview with `npm run dev` and run `npm test`.
4. Open a pull request explaining what changed and which CLI version you verified.

Use English comments and Conventional Commit messages, such as `docs(moodle): clarify sign-in prerequisites`. Keep changes focused. Do not commit credentials, account output, real course identifiers or local agent configuration.

## Update a documented release

Install the intended released CLI, then capture its command metadata and help output. For example:

```bash
moodle commands --json > data/moodle.commands.json
node scripts/capture-help.mjs moodle > data/moodle.help-all.txt
npm run generate
```

Repeat for `edstem` or `ontrack` as needed. Review captures before committing: replace real course examples with `UNIT` and use `<your-token>` for credentials. Capture MCP `tools/list` metadata where supported and update the corresponding `mcp/tools/` page; the command-reference generator does not generate those pages.

Update affected guides, the version table in README.md, the versions in STYLE.md, and `compare/web-coverage.mdx`. Run `npm test` and preview the affected pages.

## Validation commands

| Command | Checks |
| --- | --- |
| `npm run check` | Generated command references match the snapshots |
| `npm run lint` | Frontmatter, vocabulary, code fences, commands and flags |
| `npm run validate` | Mintlify build |
| `npm run broken-links` | Internal links |
| `npm test` | All of the above |
