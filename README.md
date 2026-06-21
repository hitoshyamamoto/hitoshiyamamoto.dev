# hitoshiyamamoto.dev

Hub pessoal de Hitoshi Yamamoto — **escritos**, **projetos** e **labs** num só
lugar. Construído em código (não WordPress), com um **pipeline de dados
desacoplado**: jobs agendados buscam dados externos (Medium, GitHub) e geram
artefatos JSON versionados; o build apenas os consome. O build nunca quebra por
falha de API externa.

As decisões de design (modelo de conteúdo, pipeline desacoplado e o grafo
projeto ↔ lab ↔ writeup) estão resumidas abaixo e nos comentários dos módulos.

## Stack

| Camada | Decisão |
|---|---|
| Framework | Astro 6 (Content Layer) |
| Interatividade | Astro Islands com React 19, hidratadas sob demanda |
| Estilo | Tailwind CSS v4 (via PostCSS) |
| Conteúdo | MDX nativo + agregação de RSS do Medium |
| Dados | Pipeline desacoplado (JSON versionado gerado por cron) |
| Deploy | GitHub Pages (estático) |

## Rodando localmente

Requer **Node ≥ 22.12** (ver `.nvmrc`) — exigência do Astro 6.

```bash
npm install
npm run dev          # http://localhost:4321
```

Outros comandos:

```bash
npm run build        # gera ./dist
npm run preview      # serve o build
npm run check        # checagem de tipos do Astro
npm run fetch:all    # roda os fetchers localmente (Medium + GitHub)
```

## Pipeline de dados

Os scripts em `scripts/` **não** rodam no build — rodam no workflow agendado
`refresh-data.yml`, geram os JSON em `src/data/` e commitam de volta.

- `scripts/fetch-medium.ts` — lê o RSS do Medium e faz **append** apenas de itens
  novos em `src/data/medium-posts.json` (dedupe por URL). Append-only.
  - **Semeadura única**: exporte o histórico completo em *Settings → Download your
    information* no Medium e cole o catálogo inteiro no JSON inicial. O RSS só
    devolve os ~10 posts mais recentes.
- `scripts/fetch-github.ts` — lê o campo `repo` de cada projeto em
  `src/content/projects/` (a **allowlist**) e enriquece **apenas esses** repos com
  estrelas, linguagem e último commit em `src/data/github-projects.json`.

Variáveis de ambiente (no Actions já vêm prontas; localmente são opcionais):

- `GITHUB_TOKEN` — evita rate limit do GitHub (5.000 req/h).
- `MEDIUM_USER` / `GITHUB_OWNER` — defaults: `hitoshyamamoto`.

## Modelo de conteúdo

Três collections (schemas em `src/content.config.ts`):

- **posts** (`src/content/posts/*.mdx`) — escritos nativos.
  `kind: article | interactive`; `project: <slug>` transforma o post no *writeup*
  de um projeto; `draft: true` esconde do build.
- **projects** (`src/content/projects/*.md`) — vitrine curada (allowlist).
- **labs** (`src/content/labs/*.mdx`) — manifestos de demos interativos.

O grafo **projeto ↔ lab ↔ writeup** é resolvido por slug no build
(`src/lib/relations.ts`): a página do projeto mostra "ver demo" e "ler sobre" só
quando existem; o lab linka "ver código" de volta; o writeup mostra o cartão
"Sobre o projeto X".

### Adicionar conteúdo

- **Novo projeto**: crie `src/content/projects/<slug>.md` com `repo`, `title`,
  `summary`. O `repo` precisa existir no GitHub do owner para o enriquecimento.
- **Novo escrito**: crie `src/content/posts/<slug>.mdx`. Para simulação inline,
  use `kind: interactive` e importe uma island React (`client:visible`).
- **Novo lab**: crie `src/content/labs/<slug>.mdx`. Use `embedUrl` para um demo
  hospedado (iframe no clique) ou mapeie uma island local em
  `src/pages/labs/[slug].astro` (`LOCAL_ISLANDS`).

## Deploy (GitHub Pages)

1. Crie um repositório no GitHub e suba este projeto na branch `main`.
2. Em **Settings → Pages**, defina *Source* = **GitHub Actions**.
3. Ajuste `site` (e `base`, se for um repo de projeto) em `astro.config.mjs`.
   - Domínio próprio: `site: 'https://hitoshiyamamoto.dev'`, sem `base`.
   - Pages de projeto: `site: 'https://<user>.github.io'`, `base: '/<repo>'`.

Workflows (`.github/workflows/`):

- `deploy.yml` — build + deploy em todo push na `main`.
- `refresh-data.yml` — cron a cada 6h: roda os fetchers e commita os JSON; esse
  commit dispara o `deploy`.

## Estrutura

```
scripts/        # o pipeline (fetchers em TypeScript) — não roda no build
src/data/       # artefatos JSON gerados e versionados
src/content/    # conteúdo nativo (posts, projects, labs) + schemas
src/components/  astro/ (estáticos, zero JS) · react/ (islands)
src/lib/        # merge de feed, relações, SEO
src/pages/      # rotas (escritos, projetos, labs, rss.xml, ...)
```

## Dependências e segurança

Todas as dependências estão na última major estável (Astro 6, React 19,
Tailwind 4, TypeScript 6). `npm audit` reporta apenas um aviso **low** transitivo
do `esbuild` (leitura de arquivo restrita ao dev-server **no Windows**); o
`npm audit fix --force` o "resolveria" rebaixando o Astro para a 5.x — que ainda
carrega os CVEs *high* de XSS/SSRF —, então **não** deve ser aplicado. O aviso
some quando Astro/Vite publicarem o bump do esbuild.

Tailwind v4 entra via PostCSS (`postcss.config.mjs`) em vez do plugin Vite,
porque o `@tailwindcss/vite` ainda não é compatível com o rolldown-vite do
Astro 6.

## Roadmap (fases)

- **Fase 1 — MVP**: Home + Escritos (Medium agregado) + Projetos + Sobre. *(este
  scaffold já cobre isso e um pouco da Fase 2.)*
- **Fase 2**: escrita nativa + `kind: interactive` + primeiro Lab (visualizador
  de labirintos — já incluído).
- **Fase 3**: tema game/Material 3, OG automático, busca (Pagefind), giscus.

Ver as oportunidades 9.x no documento de arquitetura para o detalhamento
(bilíngue PT/EN, canônico do Medium, analytics, acessibilidade, etc.).
