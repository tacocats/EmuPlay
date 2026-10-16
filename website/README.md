# Website

This is the EmuPlay docs & showcase site, built with [Docusaurus](https://docusaurus.io/).

Pushes to `master` that touch this folder deploy automatically to
[emuplay.app](https://emuplay.app) on Cloudflare Pages via
`.github/workflows/website-deploy.yml`. Pull requests only build the site.
The workflow needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
repository secrets and a Cloudflare Pages project named `emuplay`.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

To deploy by hand outside the workflow (needs `wrangler login` or the same
two Cloudflare env vars):

```bash
npm run build
npx wrangler pages deploy build --project-name=emuplay --branch=master
```
