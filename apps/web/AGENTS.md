# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

Domain vocabulary, deployment steps, local conventions that differ from Foldkit's defaults: write them here.

- foldkit のソースは `repos/foldkit` に取り込まない。`FOLDKIT.md` が `repos/foldkit/` 配下として挙げるファイルは、インストール済みの foldkit と同じバージョンのタグの GitHub 上で読む: `https://github.com/foldkit/foldkit/tree/foldkit@<version>/`（`<version>` は `node -p "require('./node_modules/foldkit/package.json').version"`）
