---
repo: hayai
title: hayai
summary: "CLI rápida para subir e gerenciar bancos de dados SQL, NoSQL e vetoriais locais com Docker."
highlight: true
tags: ["typescript", "cli", "docker", "databases", "developer-tools"]
lang: pt
translationKey: hayai
---

`hayai` (速い, "rápido" em japonês) é uma CLI que transforma "preciso de um banco
para testar" em um único comando: sobe uma instância isolada de SQL, NoSQL ou
vetorial em Docker, pronta para desenvolvimento e testes em segundos.

## Por quê

Provisionar um banco local deveria ser tão barato quanto criar uma branch. Na
prática, costuma ser o oposto. Três dores concretas do dia a dia motivaram o projeto:

- **Subir um banco dá trabalho repetitivo e propenso a erro.** A cada projeto,
  repete-se o mesmo ritual: escrever um `docker-compose`, achar uma porta que
  ninguém mais esteja usando, definir credenciais, esperar o contêiner ficar
  saudável e só então conectar. É atrito puro antes da primeira query.
- **Experimentar um engine diferente custa caro.** Avaliar Postgres, depois Redis,
  depois um banco vetorial significa aprender o setup Docker de cada um, com imagens,
  variáveis de ambiente e *health checks* distintos. O custo de "só testar"
  desestimula a exploração.
- **A configuração do banco não é versionável nem compartilhável.** O conhecimento
  de "como subir o ambiente" mora na cabeça de alguém ou num README desatualizado,
  não em um artefato que entra no controle de versão junto do código.

A crença por trás do hayai: o banco local deve ser descartável, reproduzível e
versionável, nunca um obstáculo entre a ideia e o experimento.

## Como

Cada uma dessas dores é atacada por uma decisão de design específica:

- **Um comando, sem `docker-compose` escrito à mão.** `hayai init -e postgresql`
  gera o contêiner, aloca automaticamente uma porta livre na faixa de 5000 a 6000
  (evitando conflito com serviços já em execução) e roda *health checks* até o banco
  responder. Não há arquivo de orquestração para manter.
- **22 engines atrás de uma interface única.** Trocar de banco é trocar uma flag. A
  cobertura vai de relacionais (PostgreSQL, MariaDB) e analíticos (DuckDB) a
  chave-valor (Redis, LevelDB, TiKV), wide-column (Cassandra), vetoriais (Qdrant,
  Weaviate, Milvus), grafos (ArangoDB, NebulaGraph), busca (Meilisearch, Typesense)
  e séries temporais (InfluxDB 2.x e 3 Core, TimescaleDB, QuestDB, VictoriaMetrics,
  Apache HoraeDB). Os engines embutidos (SQLite, DuckDB, LevelDB, LMDB) rodam como
  arquivo no host, sem servidor nem contêiner.
- **Banco como código.** Um arquivo declarativo `.hayaidb` descreve todas as bases do
  projeto; `hayai export` o gera a partir do estado atual e `hayai sync` recria tudo
  em qualquer máquina. O ambiente passa a ser versionável e compartilhável como
  qualquer outro código, enquanto a configuração global vive em `hayai.config.yaml`.
- **Ciclo de vida completo, não só "subir".** Além de `start`, `stop`, `list` e
  `logs`, o hayai cobre operações que normalmente exigiriam scripts manuais:
  `snapshot` para capturar o estado de uma base, `clone` para duplicar uma instância
  (1:1 ou 1:N), `merge` para fundir uma base de origem em outra de destino e
  `migrate` para planejar a migração entre engines distintos.
- **Inspeção visual quando faz sentido.** `hayai studio` abre painéis de administração
  no navegador para os engines que oferecem um (Qdrant, ArangoDB, InfluxDB, QuestDB,
  Meilisearch e VictoriaMetrics), sem instalar clientes adicionais.

```bash
npm install -g hayai-db

hayai init -n maindb -e postgresql -y   # cria a instância (porta alocada sozinha)
hayai init -n busca  -e meilisearch -y
hayai start                             # sobe todas as instâncias
hayai list --running                    # lista o que está no ar
hayai studio busca                      # abre o painel do Meilisearch no navegador
hayai export                            # gera o .hayaidb versionável
```

## O quê

No fim, o hayai é uma **CLI de orquestração de bancos locais sobre Docker**, escrita
em TypeScript e publicada no npm como `hayai-db`. Requer Node.js 18 ou superior e
Docker (com Docker Compose para a orquestração), sob licença MIT. O propósito é
estreito e deliberado: tornar o banco local um detalhe resolvido, para que o
desenvolvedor gaste energia no que importa, não na infraestrutura ao redor.
