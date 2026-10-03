# cli-kit docs

[![CI](https://github.com/bunizao/cli-kit-docs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bunizao/cli-kit-docs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Guides, command references and MCP setup instructions for three command-line tools, built with [Mintlify](https://www.mintlify.com):

| Tool | Source repository | Documented version |
| --- | --- | --- |
| Moodle CLI | [moodle-cli](https://github.com/bunizao/moodle-cli) | 0.9.2 |
| Ed Discussion CLI | [edstem-cli](https://github.com/bunizao/edstem-cli) | 0.7.0 |
| OnTrack CLI | [ontrack-cli](https://github.com/bunizao/ontrack-cli) | 0.3.2 |

The site covers installation, sign-in, everyday tasks, scripting and connecting AI clients. Command references describe the captured releases above; they may differ from newer releases. This repository contains the documentation, not the CLI implementations.

## Preview locally

Use Node.js 22 LTS and npm. You do not need a platform account or any of the three CLIs installed to preview or validate the docs.

```bash
git clone https://github.com/bunizao/cli-kit-docs.git
cd cli-kit-docs
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). To run all checks:

```bash
npm test
```

## Repository layout

| Path | Contents |
| --- | --- |
| `docs.json` | Site configuration and navigation |
| `moodle/`, `edstem/`, `ontrack/` | Product guides and generated command references |
| `mcp/` | Client setup, tool catalogs and security guidance |
| `developers/`, `concepts/`, `agents/` | Scripting and agent guidance |
| `compare/` | Feature and web coverage comparisons |
| `data/` | Captured command trees, help output and MCP tool catalogs |
| `scripts/` | Reference generation, help capture and documentation lint |

## How the pages stay accurate

`data/<cli>.commands.json` records `<cli> commands --json`, `data/<cli>.help-all.txt` records every help page, and `data/<cli>.mcp-tools.json` records MCP tool catalogs where available. These files contain command metadata, not account data. Example course references are replaced with placeholders before publication.

`npm run generate` builds `*/reference/*.mdx` from the command trees and help output. Edit the snapshots and regenerate rather than editing those pages directly. MCP tool pages are maintained separately against their captured catalogs.

`npm test` checks generated-reference drift, writing rules, commands and flags in shell examples, the Mintlify build and internal links. See [CONTRIBUTING.md](CONTRIBUTING.md), [STYLE.md](STYLE.md) and [scripts/README.md](scripts/README.md) for the editing and release workflow.

## Hosting

Connect `bunizao/cli-kit-docs` and its `main` branch in the [Mintlify dashboard](https://dashboard.mintlify.com), using the repository root as the docs directory. Mintlify handles website deployment after that connection is configured. The GitHub Actions workflow validates pushes and pull requests; it does not deploy the site.

## Contributing

Report documentation errors through [GitHub issues](https://github.com/bunizao/cli-kit-docs/issues), or open a pull request following [CONTRIBUTING.md](CONTRIBUTING.md). Report CLI bugs in the corresponding source repository. Remove tokens, cookies and personal or course data from examples and reports.

## License

[MIT](LICENSE). The source CLI projects have their own licenses.
