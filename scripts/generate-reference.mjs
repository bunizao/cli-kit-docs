#!/usr/bin/env node
// Generates the `*/reference/*.mdx` command-reference pages for the three
// CLIs (moodle, edstem, ontrack) from the captured `<cli> commands --json`
// output in data/*.commands.json.
//
// The JSON carries the command tree but not the "Core / Additional / Agent"
// grouping shown on `<cli> --help`, and not prose for the global options, so
// this script also parses data/*.help-all.txt (the captured --help text) for
// that. Everything else (usage lines, tables, warnings) is built from JSON.
//
// Usage:
//   node scripts/generate-reference.mjs          # write the pages
//   node scripts/generate-reference.mjs --check  # diff only, exit 1 on drift
//
// Keep this script dependency-free and readable; it is not a general MDX
// generator, just enough logic to render this one page shape.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const CHECK = process.argv.includes('--check');

const CLIS = ['moodle', 'edstem', 'ontrack'];

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

// Wrap literal `<placeholder>` text in backticks and escape braces, so
// descriptions copied verbatim from the JSON render as prose, not JSX.
function mdxText(text) {
  if (!text) return '';
  return text
    .replace(/<[^<>]+>/g, (m) => '`' + m + '`')
    .replace(/([{}])/g, '\\$1');
}

// A table cell: mdxText plus collapsing any embedded newlines.
function cell(text) {
  return mdxText(text).replace(/\s+/g, ' ').trim();
}

function code(text) {
  return '`' + text + '`';
}

// Render a Markdown table. Returns '' (never an empty table) when there are
// no rows.
function table(headers, rows) {
  if (rows.length === 0) return '';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return [head, sep, body].join('\n');
}

// Extract the canonical long flag from a Commander flags string, e.g.
// "-o, --output <file>" -> "--output", "--fields <fields>" -> "--fields".
function longFlagName(flags) {
  const match = flags.match(/--[a-zA-Z0-9-]+/);
  return match ? match[0] : flags.trim();
}

function usagePositional(p) {
  const name = p.variadic ? `${p.name}...` : p.name;
  return p.required ? `<${name}>` : `[${name}]`;
}

// ---------------------------------------------------------------------------
// Parsing data/<cli>.help-all.txt
//
// The file is a sequence of "$ <cli> [path...] --help" blocks. We only need
// two things out of it that the JSON does not carry:
//   1. the root "Core commands / Additional commands / Agent commands"
//      grouping (and command order within each group)
//   2. prose descriptions for the root-level (global) options
// The canonical *set* of global option flags is cross-checked against the
// "Global options" line every subcommand block repeats.
// ---------------------------------------------------------------------------

function splitHelpBlocks(text) {
  return text
    .split(/\n(?=\$ )/)
    .map((b) => b.trim())
    .filter(Boolean);
}

// Grab the lines of a labelled section ("Options", "Core commands", ...)
// up to the next blank line.
function parseSection(block, label) {
  const re = new RegExp(`\\n${label}\\n([\\s\\S]*?)(?:\\n\\n|$)`);
  const m = block.match(re);
  return m ? m[1] : null;
}

// Parse a two-column help section ("  --flag <x>    Description text") into
// {flags, description} pairs. Columns are separated by 2+ spaces; wrapped
// description lines are indented further and get folded into the previous
// entry.
function parseFlagLines(sectionText) {
  if (!sectionText) return [];
  const lines = sectionText.split('\n');
  const entries = [];
  for (const line of lines) {
    const m = line.match(/^ {2}(\S.*?)(?: {2,}(\S.*))?$/);
    if (!m) continue;
    if (m[2] !== undefined) {
      entries.push({ flags: m[1].trim(), description: m[2].trim() });
    } else if (entries.length) {
      // Continuation of the previous description (wrapped line).
      entries[entries.length - 1].description += ' ' + m[1].trim();
    }
  }
  return entries;
}

// Parse the "Core commands / Additional commands / Agent commands" section
// of the root help block into { group: [commandName, ...] }.
function parseRootGroups(rootBlock) {
  const groups = { Core: 'Core commands', Additional: 'Additional commands', Agent: 'Agent commands' };
  const result = {};
  for (const [key, label] of Object.entries(groups)) {
    const section = parseSection(rootBlock, label);
    result[key] = section
      ? section
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => l.split(/\s{2,}/)[0].split(/[\s,]/)[0])
      : [];
  }
  return result;
}

// The literal "Global options" line every subcommand's --help repeats. It is
// identical across every subcommand for a given CLI, so any block will do.
function parseGlobalFlagSet(blocks) {
  for (const block of blocks.slice(1)) {
    const section = parseSection(block, 'Global options');
    if (section) {
      const flags = section.replace(/\s+/g, ' ').trim();
      return new Set(
        flags
          .split(',')
          .map((f) => longFlagName(f.trim()))
          .filter(Boolean)
      );
    }
  }
  return new Set();
}

function loadHelpInfo(cli) {
  const text = readText(join(DATA_DIR, `${cli}.help-all.txt`));
  const blocks = splitHelpBlocks(text);
  const rootBlock = blocks[0];
  const rootOptions = parseFlagLines(parseSection(rootBlock, 'Options'));
  const groups = parseRootGroups(rootBlock);
  const globalFlagSet = parseGlobalFlagSet(blocks);
  return { rootOptions, groups, globalFlagSet };
}

// ---------------------------------------------------------------------------
// Rendering a command node (recursive, used for every subcommand section)
// ---------------------------------------------------------------------------

function isGlobalOption(option, globalFlagSet) {
  const name = longFlagName(option.flags);
  return name === '--help' || globalFlagSet.has(name);
}

function renderPositionalsTable(positionals) {
  const rows = positionals.map((p) => [
    code(p.variadic ? `${p.name}...` : p.name),
    p.required ? 'Yes' : 'No',
    cell(p.description),
  ]);
  return table(['Argument', 'Required', 'Description'], rows);
}

function renderOptionsTable(options, globalFlagSet) {
  const own = options.filter((o) => !isGlobalOption(o, globalFlagSet));
  if (own.length === 0) return '';
  const hasDefault = own.some((o) => o.default !== undefined || o.defaultValue !== undefined);
  const hasChoices = own.some((o) => o.choices || o.enumValues);
  const headers = ['Flags', 'Description'];
  if (hasDefault) headers.push('Default');
  if (hasChoices) headers.push('Choices');
  const rows = own.map((o) => {
    const row = [code(o.flags), cell(o.description)];
    if (hasDefault) {
      const def = o.default ?? o.defaultValue;
      row.push(def === undefined ? '' : code(String(def)));
    }
    if (hasChoices) {
      const choices = o.choices || o.enumValues;
      row.push(choices ? choices.map((c) => code(c)).join(', ') : '');
    }
    return row;
  });
  return table(headers, rows);
}

function buildUsage(cliName, path, node) {
  let usage = `${cliName} ${path.join(' ')} [options]`;
  const positionals = node.positionals || [];
  if (positionals.length) {
    usage += ' ' + positionals.map(usagePositional).join(' ');
  }
  if ((node.commands || []).length) {
    usage += ' [command]';
  }
  return usage;
}

// Renders one node's own body (usage, aliases, tables, warning) without its
// heading. `path` is the full command-path segments after the CLI name.
function renderNodeBody(cliName, path, node, globalFlagSet) {
  const parts = [];

  parts.push('```bash\n' + buildUsage(cliName, path, node) + '\n```');

  if (node.aliases && node.aliases.length) {
    parts.push(`**Aliases:** ${node.aliases.map((a) => code(a)).join(', ')}`);
  }

  const argsTable = renderPositionalsTable(node.positionals || []);
  if (argsTable) {
    parts.push('**Arguments**\n\n' + argsTable);
  }

  const optionsTable = renderOptionsTable(node.options || [], globalFlagSet);
  if (optionsTable) {
    parts.push('**Options**\n\n' + optionsTable);
  }

  if (node.mutating) {
    parts.push(
      '<Warning>\n' +
        'This command changes data on the server. It asks for confirmation unless you pass `--yes`. ' +
        'Add `--dry-run` to print the plan without applying it.\n' +
        '</Warning>'
    );
  }

  return parts.join('\n\n');
}

// Recursively renders a node and all descendants as `## <full path>`
// sections (every depth uses `##`, matching the spec example).
function renderSubcommands(cliName, path, node, globalFlagSet) {
  const sections = [];
  for (const sub of node.commands || []) {
    const subPath = [...path, sub.name];
    sections.push(`## ${cliName} ${subPath.join(' ')}\n\n` + renderNodeBody(cliName, subPath, sub, globalFlagSet));
    sections.push(renderSubcommands(cliName, subPath, sub, globalFlagSet));
  }
  return sections.filter(Boolean).join('\n\n');
}

function renderCommandPage(cliName, node, globalFlagSet) {
  const frontmatter = [
    '---',
    `title: "${cliName} ${node.name}"`,
    `description: "${node.description.replace(/"/g, '\\"')}"`,
    `sidebarTitle: "${node.name}"`,
    '---',
  ].join('\n');

  const body = renderNodeBody(cliName, [node.name], node, globalFlagSet);
  const subsections = renderSubcommands(cliName, [node.name], node, globalFlagSet);
  const footer = `Global options apply to every command. See [Global options](/${cliName}/reference/index#global-options).`;

  return [frontmatter, '', body, subsections, footer].filter(Boolean).join('\n\n') + '\n';
}

// ---------------------------------------------------------------------------
// Rendering the index page
// ---------------------------------------------------------------------------

function renderGlobalOptionsTable(rootOptions) {
  const rows = rootOptions.map((o) => [code(o.flags), cell(o.description)]);
  return table(['Flags', 'Description'], rows);
}

function renderGroupTable(cliName, names, commandsByName) {
  const rows = names
    .filter((name) => commandsByName.has(name))
    .map((name) => {
      const c = commandsByName.get(name);
      const aliases = c.aliases && c.aliases.length ? c.aliases.map((a) => code(a)).join(', ') : '—';
      return [`[${code(c.name)}](/${cliName}/reference/${c.name})`, aliases, cell(c.description)];
    });
  return table(['Command', 'Aliases', 'Description'], rows);
}

function renderIndexPage(cliName, data, helpInfo) {
  const commandsByName = new Map(data.commands.map((c) => [c.name, c]));

  const frontmatter = [
    '---',
    `title: "${cliName} command reference"`,
    `description: "Every ${cliName} command, its arguments, options and defaults, generated from ${cliName} commands --json."`,
    'sidebarTitle: "Reference"',
    '---',
  ].join('\n');

  const intro = `\`${cliName}\` v${data.version} — ${data.description}`;

  const globalOptions =
    '## Global options\n\n' +
    'These options work on every command; command pages only list the options specific to that command.\n\n' +
    renderGlobalOptionsTable(helpInfo.rootOptions);

  const exitCodes = `For what each exit code means, see [Errors and exit codes](/concepts/errors-and-exit-codes).`;

  const groupSections = ['Core', 'Additional', 'Agent']
    .map((group) => {
      const names = helpInfo.groups[group] || [];
      const t = renderGroupTable(cliName, names, commandsByName);
      if (!t) return '';
      return `## ${group} commands\n\n${t}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const note =
    '<Note>\n' +
    `This page and the pages under \`${cliName}/reference\` are generated from \`${cliName} commands --json\`. ` +
    'Run `npm run generate` to rebuild them after the CLI changes, and `npm run check` to confirm the checked-in ' +
    'pages still match the captured command tree.\n' +
    '</Note>';

  return (
    [frontmatter, '', intro, globalOptions, exitCodes, groupSections, note].filter(Boolean).join('\n\n') + '\n'
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generateForCli(cli) {
  const data = readJSON(join(DATA_DIR, `${cli}.commands.json`));
  const helpInfo = loadHelpInfo(cli);

  const files = new Map();
  files.set(`${cli}/reference/index.mdx`, renderIndexPage(cli, data, helpInfo));
  for (const command of data.commands) {
    files.set(`${cli}/reference/${command.name}.mdx`, renderCommandPage(cli, command, helpInfo.globalFlagSet));
  }
  return files;
}

function main() {
  const allFiles = new Map();
  for (const cli of CLIS) {
    for (const [path, content] of generateForCli(cli)) {
      allFiles.set(path, content);
    }
  }

  if (!CHECK) {
    for (const [relPath, content] of allFiles) {
      const fullPath = join(ROOT, relPath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, 'utf8');
    }
    console.log(`Generated ${allFiles.size} files.`);
    return;
  }

  const diffs = [];
  for (const [relPath, content] of allFiles) {
    const fullPath = join(ROOT, relPath);
    if (!existsSync(fullPath) || readText(fullPath) !== content) {
      diffs.push(relPath);
    }
  }

  if (diffs.length) {
    console.error('Generated reference pages are out of date:');
    for (const d of diffs) console.error(`  ${d}`);
    console.error('\nRun `npm run generate` and commit the result.');
    process.exit(1);
  }

  console.log('Reference pages are up to date.');
}

main();
