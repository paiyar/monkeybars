# Npm Git Install Links

Slug: document `--install-links=true` for GitHub global installs, then move users to a published npm package.

## Context

The GitHub install path now gets past the repository `prepare` step:

```sh
npm install -g github:paiyar/monkeybars#main --force
```

The build succeeds, but on npm setups where `install-links=false`, the global
binary can be left as a broken symlink. npm links the Git dependency to a temp
clone under its cache, then that temp clone no longer contains the packed
package output expected by the `bin` entry:

```text
bin/monkeybars -> ../lib/node_modules/@paiyar/monkeybars/dist/index.js
```

The package cannot reliably force this behavior from its own scripts because
npm decides whether to link or pack the Git dependency before package scripts
can repair the final global install layout.

## Recommendation

Keep the `npx --package github:paiyar/monkeybars#main -- monkeybars ...` path as
the preferred GitHub checkout install path.

For global installs from GitHub, document and recommend:

```sh
npm install -g github:paiyar/monkeybars#main --force --install-links=true
```

Users who want this behavior globally can also run:

```sh
npm config set install-links true
```

The long-term recommended install should be a published npm package:

```sh
npm install -g @paiyar/monkeybars
```

Publishing avoids the Git dependency temp-clone path entirely and lets npm
install the package tarball directly.

## Plan

1. Keep README GitHub global install examples on `--install-links=true`.
2. Add a short troubleshooting note for broken `monkeybars` symlinks that
   points users to `npm config get install-links`.
3. Add a release/publish checklist for `@paiyar/monkeybars` so the primary
   install command can become `npm install -g @paiyar/monkeybars`.
4. After the package is published, make npm registry install the first
   recommendation and keep GitHub installs as a development or pin-to-commit
   path.

## Acceptance Criteria

- README and plugin README show `--install-links=true` for GitHub global
  installs.
- A fresh global GitHub install with `--install-links=true` produces a working
  `monkeybars --help`.
- Documentation explains why the flag is needed for some npm configurations.
- The npm registry publishing path is documented before replacing the primary
  install recommendation.
