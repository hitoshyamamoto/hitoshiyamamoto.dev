// Núcleo de i18n. Para adicionar um idioma: inclua o código em `locales`, uma
// entrada em `localeMeta`, uma coluna em `routeSegments` e uma em `ui`.

export const defaultLocale = 'pt' as const;
export const locales = ['pt', 'en'] as const;
export type Locale = (typeof locales)[number];

export const localeMeta: Record<Locale, { label: string; short: string; htmlLang: string; dateLocale: string }> = {
  pt: { label: 'Português', short: 'PT-BR', htmlLang: 'pt-BR', dateLocale: 'pt-BR' },
  en: { label: 'English', short: 'EN', htmlLang: 'en', dateLocale: 'en-US' },
};

// Chaves de página canônicas e o segmento de URL de cada uma por idioma.
export type RouteKey = 'home' | 'writing' | 'projects' | 'labs' | 'about';

const routeSegments: Record<Locale, Record<Exclude<RouteKey, 'home'>, string>> = {
  pt: { writing: 'escritos', projects: 'projetos', labs: 'labs', about: 'sobre' },
  en: { writing: 'writing', projects: 'projects', labs: 'labs', about: 'about' },
};

const prefix = (locale: Locale) => (locale === defaultLocale ? '' : `/${locale}`);

/** Caminho absoluto para uma página, no idioma dado (com slug opcional). */
export function path(locale: Locale, key: RouteKey, slug?: string): string {
  if (key === 'home') return prefix(locale) || '/';
  const seg = routeSegments[locale][key];
  return `${prefix(locale)}/${seg}${slug ? `/${slug}` : ''}`;
}

/** Deriva o idioma a partir da URL (primeiro segmento do path). */
export function getLocaleFromUrl(url: URL): Locale {
  const seg = url.pathname.split('/').filter(Boolean)[0];
  return (locales as readonly string[]).includes(seg) ? (seg as Locale) : defaultLocale;
}

/** Identifica a seção atual (para o seletor de idioma e o destaque do menu). */
export function getRouteKeyFromUrl(url: URL): RouteKey {
  const parts = url.pathname.split('/').filter(Boolean);
  const rest = (locales as readonly string[]).includes(parts[0]) ? parts.slice(1) : parts;
  if (rest.length === 0) return 'home';
  const seg = rest[0];
  for (const loc of locales) {
    const map = routeSegments[loc];
    for (const key of Object.keys(map) as Exclude<RouteKey, 'home'>[]) {
      if (map[key] === seg) return key;
    }
  }
  return 'home';
}

export const ui = {
  pt: {
    'site.name': 'Hitoshi Yamamoto',
    'site.fulltitle': 'Hitoshi Yamamoto: escritos, projetos e labs',
    'site.tagline':
      'Engenharia, escrita e demos interativos. Um hub em código que reúne meus escritos, projetos e labs num só lugar.',
    'nav.writing': 'Escritos',
    'nav.projects': 'Projetos',
    'nav.labs': 'Labs',
    'nav.about': 'Sobre',
    'footer.madeWith': 'feito com Astro',
    'badge.native': 'Nativo',
    'badge.interactive': 'Interativo',
    'badge.medium': 'Medium',
    'home.cta.projects': 'Ver projetos',
    'home.cta.about': 'Sobre mim',
    'home.recent': 'Escritos recentes',
    'home.featured': 'Projetos em destaque',
    'common.seeAll': 'ver todos →',
    'writing.title': 'Escritos',
    'writing.intro':
      'Tudo que escrevo num feed só: artigos nativos deste site e posts agregados do Medium, ordenados por data.',
    'writing.empty': 'Nada publicado ainda.',
    'projects.title': 'Projetos',
    'projects.intro':
      'Curadoria manual: só o que escolhi destacar. Estrelas, linguagem e último commit vêm do GitHub via pipeline desacoplado.',
    'labs.title': 'Labs',
    'labs.intro': 'Demos interativos. Cada card abre o demo ao clique, sem cold start na entrada da página.',
    'project.about': 'Sobre o projeto',
    'project.view': 'Ver projeto →',
    'project.highlight': 'destaque',
    'project.lastCommit': 'último commit:',
    'links.code': 'Ver código',
    'links.demo': 'Ver demo',
    'links.read': 'Ler sobre',
    'post.allWriting': '← Todos os escritos',
    'projects.all': '← Todos os projetos',
    'labs.all': '← Todos os labs',
    'lab.load': 'Carregar demo',
    'lab.open': 'Abrir demo',
    'lab.local': 'Demo local (island), renderizado pela página do Lab.',
    'notFound.title': 'Página não encontrada',
    'notFound.body': 'O link pode estar quebrado ou a página foi movida.',
    'notFound.home': '← Voltar para a home',
    'lang.switch': 'EN',
  },
  en: {
    'site.name': 'Hitoshi Yamamoto',
    'site.fulltitle': 'Hitoshi Yamamoto: writing, projects & labs',
    'site.tagline':
      'Engineering, writing, and interactive demos. A hub built in code that brings my writing, projects, and labs into one place.',
    'nav.writing': 'Writing',
    'nav.projects': 'Projects',
    'nav.labs': 'Labs',
    'nav.about': 'About',
    'footer.madeWith': 'built with Astro',
    'badge.native': 'Native',
    'badge.interactive': 'Interactive',
    'badge.medium': 'Medium',
    'home.cta.projects': 'View projects',
    'home.cta.about': 'About me',
    'home.recent': 'Recent writing',
    'home.featured': 'Featured projects',
    'common.seeAll': 'see all →',
    'writing.title': 'Writing',
    'writing.intro':
      'Everything I write in a single feed: native articles from this site, ordered by date.',
    'writing.empty': 'Nothing published yet.',
    'projects.title': 'Projects',
    'projects.intro':
      'Hand-picked: only what I chose to highlight. Stars, language, and last commit come from GitHub via a decoupled pipeline.',
    'labs.title': 'Labs',
    'labs.intro': 'Interactive demos. Each card loads the demo on click, with no cold start when the page opens.',
    'project.about': 'About the project',
    'project.view': 'View project →',
    'project.highlight': 'featured',
    'project.lastCommit': 'last commit:',
    'links.code': 'View code',
    'links.demo': 'View demo',
    'links.read': 'Read about',
    'post.allWriting': '← All writing',
    'projects.all': '← All projects',
    'labs.all': '← All labs',
    'lab.load': 'Load demo',
    'lab.open': 'Open demo',
    'lab.local': 'Local demo (island), rendered by the Lab page.',
    'notFound.title': 'Page not found',
    'notFound.body': 'The link may be broken or the page was moved.',
    'notFound.home': '← Back to home',
    'lang.switch': 'PT',
  },
} as const;

export type UiKey = keyof (typeof ui)['pt'];

/** Tradutor para um idioma: t('nav.writing'). */
export function useTranslations(locale: Locale) {
  return function t(key: UiKey): string {
    return ui[locale][key] ?? ui[defaultLocale][key];
  };
}
