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

## Product catalog v2

The production build now emits a generic catalog for games and platform clients while retaining the legacy game index. `windows-x64`, `linux-x64`, `linux-arm64`, `android`, and `ios` are reserved platform identities; only releases backed by verified public artifacts are marked available. Firehammer Library remains `trust-onboarding-required` with no public download. Neon Orbit 2.0.1 routes and verification hashes are unchanged.

The shared presentation uses local assets and system fonts only, includes visible keyboard focus and reduced-motion behavior, and labels Neon Orbit artwork as abstract key art rather than gameplay. Run `npm test` and `npm run build` before deployment.