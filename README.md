# Firehammer Public Store

Static public catalog for games distributed through Firehammer and published by Shadow of the Moon Studios.

The Store contains public catalog data, presentation assets, and clean download redirects. Production binaries remain in the release-only `firehammer-releases` GitHub repository and are not committed here.

```powershell
npm test
npm run build
```

Cloudflare Pages configuration:

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Environment variables: none
