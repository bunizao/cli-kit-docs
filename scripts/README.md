# Documentation scripts

Run these scripts from the repository root. Generation and lint use only Node.js; build and link validation use the locked Mintlify dependency.

## Generate command references

`generate-reference.mjs` builds `moodle/reference/*.mdx`, `edstem/reference/*.mdx` and `ontrack/reference/*.mdx` from `data/*.commands.json` and `data/*.help-all.txt`. Help output supplies command grouping and global-option descriptions that the command trees do not include.

```bash
npm run generate
npm run check
```

The first command writes pages. The second compares the expected pages with the files on disk and exits with status 1 if they differ. Do not edit generated pages by hand. MCP tool pages are maintained separately.

## Capture help output

With the intended released CLI on PATH, capture its command tree first, then every help page:

```bash
moodle commands --json > data/moodle.commands.json
node scripts/capture-help.mjs moodle > data/moodle.help-all.txt
```

`capture-help.mjs` also accepts `edstem` and `ontrack`. It reads the captured command tree and invokes the CLI with `--help` for each command path, preserving the `$ <cli> ... --help` block format the generator expects.

Review the snapshots for credentials and real course examples before publication. See [CONTRIBUTING.md](../CONTRIBUTING.md) for the complete release workflow.

## Lint documentation

```bash
npm run lint
```

`lint-docs.mjs` checks MDX frontmatter, tagged code fences, vocabulary, user-facing prose and shell examples against the captured command trees.
