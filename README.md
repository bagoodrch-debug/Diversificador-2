# Distribui Rico

Simulador gratuito de diversificação de investimentos para o público brasileiro. Site 100% estático — HTML5, CSS3 e JavaScript ES6 puro, sem frameworks, sem build, sem `node_modules`.

## Rodando localmente

Não precisa de servidor nem de instalação. Basta abrir `index.html` diretamente no navegador (duplo-clique ou `file://`).

## Estrutura de pastas

```
distribui-rico/
├── index.html                 → página principal (simulador)
├── sobre.html                 → institucional
├── metodologia.html           → como os percentuais são calculados
├── sitemap.xml
├── robots.txt
│
├── css/
│   ├── tokens.css             → variáveis de cor, tipografia, espaçamento
│   ├── base.css                → reset e estilos globais
│   ├── layout.css              → header, footer, estrutura de seção
│   ├── components.css          → botões, cards, sliders, tabelas, toast...
│   └── pages/
│       ├── home.css            → estilos específicos do hero da home
│       └── content.css         → estilos de sobre.html / metodologia.html
│
├── js/
│   ├── core/                   → utilitários genéricos (DOM, formatação, estado)
│   ├── data/                   → categorias e ativos de exemplo
│   ├── services/                → regras de negócio + integração com a brapi.dev
│   ├── components/              → toast, loading, skeleton, gráfico, cartões de ativo
│   └── pages/
│       └── simulador.page.js   → conecta tudo (único arquivo que orquestra a página)
│
└── assets/
    ├── icons/favicon.svg
    └── og/distribui-rico-og.png
```

Copie essa árvore exatamente como está — os caminhos dentro do HTML e do CSS são relativos (`css/tokens.css`, `js/core/dom.js` etc.), então renomear ou mover uma pasta quebra os links.

## Publicando no GitHub Pages

1. Crie um repositório (ex.: `distribui-rico`) e suba todo o conteúdo da pasta acima na raiz do repositório (não dentro de uma subpasta).
2. No GitHub: **Settings → Pages → Source → Deploy from a branch**, selecione a branch `main` e a pasta `/ (root)`.
3. O GitHub Pages publica em `https://<seu-usuario>.github.io/<nome-do-repo>/`.
4. **Atualize as URLs absolutas antes de publicar** — três arquivos têm `https://distribuirico.com.br/` fixo (usado para SEO/Open Graph, que exigem URL absoluta):
   - `index.html`, `sobre.html`, `metodologia.html` → tags `canonical`, `og:image`, `og:url`, `twitter:image`
   - `sitemap.xml` → todas as `<loc>`
   - `robots.txt` → linha `Sitemap:`

   Se for usar um dyomínio próprio (`distribuirico.com.br` ou outro), essas URLs já estão prontas — só aponte o DNS para o GitHub Pages e configure o domínio customizado nas configurações do repositório.

## ⚠️ Aviso importante sobre a chave da brapi.dev

A chave de API da brapi.dev está em `js/services/api.js`, em uma constante `API_KEY`. Como o site é 100% estático (sem backend), **essa chave fica visível a qualquer pessoa que abrir o DevTools do navegador** — isso é inerente a qualquer chamada feita direto do frontend, não é um bug deste código especificamente. A própria documentação da brapi.dev recomenda não expor chaves no frontend em produção.

Antes de um lançamento público real, considere:
- Um endpoint próprio (mesmo que uma função serverless simples) que guarda a chave no servidor e repassa a cotação para o frontend; ou
- Aceitar o risco se o plano da brapi.dev usado for gratuito/de baixo custo e o pior cenário for outra pessoa consumir sua cota.

## Segurança e cabeçalhos HTTP

O `<meta http-equiv="Content-Security-Policy">` no `<head>` cobre a maior parte da política, mas a diretiva `frame-ancestors` (proteção contra clickjacking) **não funciona via `<meta>`** — só via cabeçalho HTTP real. O GitHub Pages não permite configurar cabeçalhos HTTP customizados. Se a proteção contra clickjacking for um requisito (recomendável para uma ferramenta financeira), hospede em um serviço que permita configurar headers (Cloudflare Pages, Netlify, Vercel) em vez do GitHub Pages puro, ou coloque o GitHub Pages atrás de um proxy/CDN que adicione o header.

## Navegadores suportados

Qualquer navegador moderno com suporte a `<canvas>`, CSS `:has()` e `backdrop-filter` (Chrome/Edge 105+, Safari 15.4+, Firefox 121+). Em navegadores mais antigos, o site continua funcional — os seletores `:has()` e `backdrop-filter` degradam silenciosamente (o card de categoria selecionado perde o destaque visual e o header perde o efeito de vidro fosco, mas nada quebra).
