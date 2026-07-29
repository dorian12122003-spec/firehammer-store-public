# Firehammer Store

Public web storefront for Firehammer, an independent game platform created by Dorian Cockrel.

Public product publication is currently paused. The generated catalog contains only products named
in `catalog-source/publication-state.json`; that active list is intentionally empty. Historical
release artifacts and signatures remain preserved outside this active Store presentation.

The future Windows application is also named Firehammer Store. Its main areas are Store, Library,
Downloads, and Settings; the existing Firehammer Library implementation remains the installed-game
subsystem and compatibility foundation.

Run `npm test` and `npm run build` before deployment.

## Cache policy

`src/_headers` keeps HTML and catalog responses immediately revalidatable and marks product pages
and the custom 404 document `no-store`. Long-lived immutable caching is reserved for explicitly
versioned files under `assets/immutable/` and `downloads/immutable/`; ordinary assets and downloads
must not use that policy.
