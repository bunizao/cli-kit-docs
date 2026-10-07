# Repository instructions

- Only English comments. Use Conventional Commits.
- Keep scripts simple, readable and dependency-free where practical.
- Follow STYLE.md and document the captured release versions in data/.
- Never include credentials, personal data or real course examples.
- Generate */reference/*.mdx with npm run generate; do not edit them by hand. The one exception is unicorn/reference/tools.mdx, which is written by hand against the unicorn source because unicorn has no captured command tree.
- Add new documentation pages to docs.json navigation.
- Run npm test after changes and preview affected pages when layout changes.
- Commit completed logical chunks autonomously in focused batches.
