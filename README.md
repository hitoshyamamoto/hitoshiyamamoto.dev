# hitoshiyamamoto.dev

Hub pessoal de Hitoshi Yamamoto: **escritos**, **projetos** e **labs** num só
lugar, bilíngue (PT na raiz, EN em `/en`). Construído em código (não WordPress),
com um **pipeline de dados desacoplado**: jobs agendados buscam dados externos
(Medium, GitHub) e geram artefatos JSON versionados; o build apenas os consome. O
build nunca quebra por falha de API externa.

As decisões de design (modelo de conteúdo, pipeline desacoplado e o grafo
projeto ↔ lab ↔ writeup) estão resumidas abaixo e nos comentários dos módulos.

## Stack

| Camada | Decisão |
|---|---|
| Framework | Astro 6 (Content Layer) |
| Interatividade | Astro Islands com React 19, hidratadas sob demanda |
| Estilo | Tailwind CSS v4 (via PostCSS), 3 temas (light/dark/coffee) |
| Conteúdo | MDX nativo + agregação de RSS do Medium; fórmulas com KaTeX |
| i18n | PT na raiz, EN em `/en` (segmentos traduzidos, hreflang, seletor PT/EN) |
| Dados | Pipeline desacoplado (JSON versionado gerado por cron) |
| Deploy | GitHub Pages (estático) |

## Rodando localmente

Requer **Node >= 22** (ver `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:4321
```

Outros comandos:

```bash
npm run build        # gera ./dist
npm run preview      # serve o build
npm run check        # type-check do Astro (astro check)
npm run fetch:all    # roda os fetchers localmente (Medium + GitHub)
```

## Pipeline de dados

Os scripts em `scripts/` **não** rodam no build: rodam no workflow agendado
`refresh-data.yml`, geram os JSON em `src/data/` e commitam de volta.

- `scripts/fetch-medium.ts`: lê o RSS do Medium e faz **append** apenas de itens
  novos em `src/data/medium-posts.json` (dedupe por URL). Append-only.
  - **Semeadura única**: exporte o histórico completo em *Settings > Download your
    information* no Medium e cole o catálogo inteiro no JSON inicial. O RSS só
    devolve os ~10 posts mais recentes.
- `scripts/fetch-github.ts`: lê o campo `repo` de cada projeto em
  `src/content/projects/` (a **allowlist**) e enriquece **apenas esses** repos com
  estrelas, linguagem e último commit em `src/data/github-projects.json`.

Variáveis de ambiente (no Actions já vêm prontas; localmente são opcionais):

- `GITHUB_TOKEN`: evita rate limit do GitHub (5.000 req/h).
- `MEDIUM_USER` / `GITHUB_OWNER`: defaults `hitoshyamamoto`.

## Modelo de conteúdo

Três collections (schemas em `src/content.config.ts`):

- **posts** (`src/content/posts/*.mdx`): escritos nativos. `kind: article |
  interactive`; `project: <translationKey>` transforma o post no *writeup* de um
  projeto; `draft: true` esconde do build.
- **projects** (`src/content/projects/*.md`): vitrine curada (allowlist).
- **labs** (`src/content/labs/*.mdx`): manifestos de demos interativos.

Cada item carrega `lang` (`pt` | `en`) e uma `translationKey` idioma-neutra que
pareia as traduções. Em **projects** a `translationKey` é obrigatória e também é o
slug público (`/projetos/<translationKey>`).

O grafo **projeto ↔ lab ↔ writeup** é resolvido por `translationKey` no build
(`src/lib/relations.ts`), sempre na variante do idioma corrente: a página do
projeto mostra "ver demo" e "ler sobre" só quando existem; o lab linka "ver
código" de volta; o writeup mostra o cartão "Sobre o projeto X".

### Adicionar conteúdo

- **Novo projeto**: crie `src/content/projects/<slug>.md` com `title`, `summary`,
  `lang: pt` e `translationKey: <slug>`. O `repo` é opcional, mas, se presente,
  precisa existir no GitHub do owner para o enriquecimento. Para a versão em
  inglês, crie `<slug>.en.md` com `lang: en` e a **mesma** `translationKey`.
- **Novo escrito**: crie `src/content/posts/<slug>.mdx` com `lang` e, para parear
  PT/EN, a mesma `translationKey`. Para simulação inline, use `kind: interactive`
  e importe uma island React (`client:visible`).
- **Novo lab**: crie `src/content/labs/<slug>.mdx`. Use `embedUrl` para um demo
  hospedado (iframe no clique) ou mapeie uma island local em
  `src/pages/labs/[slug].astro` (`LOCAL_ISLANDS`), selecionada pela `translationKey`.

## Internacionalização (i18n)

PT é o idioma padrão e vive na raiz (`/escritos`, `/projetos`, `/labs`, `/sobre`).
EN vive sob `/en` com os segmentos traduzidos (`/en/writing`, `/en/projects`,
`/en/labs`, `/en/about`). O pareamento por `translationKey` gera os `hreflang` no
`<head>` e alimenta o seletor PT/EN. Os helpers (`path`, `useTranslations`,
`localeMeta`, `routeSegments`) ficam em `src/i18n/ui.ts`.

## Deploy (GitHub Pages)

1. Crie um repositório no GitHub e suba este projeto na branch `main`.
2. Em **Settings > Pages**, defina *Source* = **GitHub Actions**.
3. Ajuste `site` (e `base`, se for um repo de projeto) em `astro.config.mjs`.
   - Domínio próprio: `site: 'https://hitoshiyamamoto.dev'`, sem `base`.
   - Pages de projeto: `site: 'https://<user>.github.io'`, `base: '/<repo>'`.

Workflows (`.github/workflows/`), com actions fixadas por SHA (comentário da
versão) para hardening e Node lido do `.nvmrc`:

- `deploy.yml`: type-check (`astro check`) + build + deploy em todo push na `main`.
- `ci.yml`: em Pull Requests para a `main`, roda type-check + build (sem deploy),
  pegando erros antes do merge.
- `refresh-data.yml`: cron a cada 6h: roda os fetchers e commita os JSON; esse
  commit dispara o `deploy`.

## Estrutura

```
scripts/        # o pipeline (fetchers em TypeScript), não roda no build
src/data/       # artefatos JSON gerados e versionados
src/content/    # conteúdo nativo (posts, projects, labs) + schemas
src/components/  astro/ (estáticos, zero JS) e react/ (islands)
src/i18n/       # tabela de idiomas, rotas traduzidas e helpers
src/lib/        # merge de feed, relações, SEO
src/pages/      # rotas PT na raiz e EN sob /en (escritos, projetos, labs, rss.xml)
```

## Dependências e segurança

As dependências estão na última major estável (Astro 6, React 19, Tailwind 4,
TypeScript 6). `npm audit` reporta **3 avisos low**, todos do mesmo `esbuild`
transitivo (via `astro` e `@astrojs/mdx`): leitura de arquivo restrita ao
dev-server **no Windows**, sem efeito sobre o site publicado, que é estático. O
`npm audit fix --force` "resolveria" rebaixando o Astro para a 5.x (mudança
**breaking**), então **não** deve ser aplicado; o aviso some quando Astro/Vite
publicarem o bump do `esbuild`.

Tailwind v4 entra via PostCSS (`postcss.config.mjs`) em vez do plugin Vite,
porque o `@tailwindcss/vite` ainda não é compatível com o rolldown-vite do
Astro 6.

## Roadmap

- **Feito**: Home + Escritos (Medium agregado + nativo) + Projetos + Labs +
  Sobre; bilíngue PT/EN; 3 temas (light/dark/coffee); fórmulas em KaTeX; primeiro
  Lab (visualizador de labirintos).
- **Próximos**: OG automático, busca (Pagefind), comentários (giscus), canônico
  do Medium, analytics e melhorias de acessibilidade.
