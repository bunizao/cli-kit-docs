#!/usr/bin/env node
// Capture every `--help` page of a CLI into the format stored in data/<cli>.help-all.txt.
// The command tree comes from data/<cli>.commands.json, so run `<cli> commands --json` first.
// `--help` never touches a session, the network or the keychain.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const cli = process.argv[2];
if (!cli) {
  console.error("usage: node scripts/capture-help.mjs <moodle|edstem|ontrack> > data/<cli>.help-all.txt");
  process.exit(2);
}

const tree = JSON.parse(readFileSync(new URL(`../data/${cli}.commands.json`, import.meta.url), "utf8"));

function* paths(commands, prefix = []) {
  for (const command of commands) {
    const path = [...prefix, command.name];
    yield path;
    if (command.commands?.length) yield* paths(command.commands, path);
  }
}

const pages = [[], ...paths(tree.commands)].map((path) => {
  const args = [...path, "--help"];
  const out = execFileSync(cli, args, { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });
  return `$ ${[cli, ...args].join(" ")}\n${out.trimEnd()}\n`;
});

process.stdout.write(pages.join("\n\n") + "\n");
