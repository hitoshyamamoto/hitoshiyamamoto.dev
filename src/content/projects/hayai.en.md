---
repo: hayai
title: hayai
summary: "A fast CLI to spin up and manage local SQL, NoSQL and vector databases with Docker."
highlight: true
tags: ["typescript", "cli", "docker", "databases", "developer-tools"]
lang: en
translationKey: hayai
---

`hayai` (速い, "fast" in Japanese) is a CLI that turns "I need a database to test"
into a single command: it spins up an isolated SQL, NoSQL or vector instance in
Docker, ready for development and testing in seconds.

## Why

Provisioning a local database should be as cheap as creating a branch. In practice
it is usually the opposite. Three concrete day-to-day pains motivated the project:

- **Standing up a database is repetitive and error-prone.** Every project repeats the
  same ritual: write a `docker-compose`, find a port nobody else is using, set
  credentials, wait for the container to become healthy and only then connect. Pure
  friction before the first query.
- **Trying a different engine is expensive.** Evaluating Postgres, then Redis, then a
  vector database means learning each one's Docker setup, with distinct images,
  environment variables and health checks. The cost of "just testing" discourages
  exploration.
- **The database setup is neither versionable nor shareable.** The knowledge of "how
  to bring the environment up" lives in someone's head or a stale README, not in an
  artifact that enters version control alongside the code.

The belief behind hayai: a local database should be disposable, reproducible and
versionable, never an obstacle between the idea and the experiment.

## How

Each of those pains is met by a specific design decision:

- **One command, no hand-written `docker-compose`.** `hayai init -e postgresql`
  generates the container, automatically allocates a free port in the 5000 to 6000
  range (avoiding conflicts with running services) and runs health checks until the
  database responds. There is no orchestration file to maintain.
- **22 engines behind a single interface.** Switching databases is switching a flag.
  Coverage spans relational (PostgreSQL, MariaDB) and analytics (DuckDB), key-value
  (Redis, LevelDB, TiKV), wide-column (Cassandra), vector (Qdrant, Weaviate, Milvus),
  graph (ArangoDB, NebulaGraph), search (Meilisearch, Typesense) and time series
  (InfluxDB 2.x and 3 Core, TimescaleDB, QuestDB, VictoriaMetrics, Apache HoraeDB).
  The embedded engines (SQLite, DuckDB, LevelDB, LMDB) run as files on the host, with
  no server or container.
- **Databases as code.** A declarative `.hayaidb` file describes all of a project's
  databases; `hayai export` generates it from the current state and `hayai sync`
  recreates everything on any machine. The environment becomes versionable and
  shareable like any other code, while global configuration lives in
  `hayai.config.yaml`.
- **A full lifecycle, not just "spin up".** Beyond `start`, `stop`, `list` and `logs`,
  hayai covers operations that would normally need manual scripts: `snapshot` to
  capture a database's state, `clone` to duplicate an instance (1:1 or 1:N), `merge`
  to fold a source database into a target, and `migrate` to plan a migration across
  different engines.
- **Visual inspection when it makes sense.** `hayai studio` opens admin dashboards in
  the browser for the engines that ship one (Qdrant, ArangoDB, InfluxDB, QuestDB,
  Meilisearch and VictoriaMetrics), with no extra clients to install.

```bash
npm install -g hayai-db

hayai init -n maindb -e postgresql -y   # create the instance (port allocated for you)
hayai init -n search -e meilisearch -y
hayai start                             # bring every instance up
hayai list --running                    # list what is running
hayai studio search                     # open the Meilisearch dashboard in the browser
hayai export                            # generate the versionable .hayaidb
```

## What

In the end, hayai is a **local-database orchestration CLI on top of Docker**, written
in TypeScript and published on npm as `hayai-db`. It requires Node.js 18 or higher
and Docker (with Docker Compose for orchestration), under the MIT license. Its purpose
is narrow and deliberate: make the local database a solved detail, so developers spend
energy on what matters rather than the surrounding infrastructure.
