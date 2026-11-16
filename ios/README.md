# DraftTimer iOS

A Vendetta/Revenge-compatible plugin for Endcord Mobile. This is a native plugin, separate from the browser userscript in the repository root.

## Behaviour

- Fixed 61-second interval.
- Only sends the current non-empty draft in the configured channel.
- Only sends while Discord is active and that exact channel is selected.
- Skips missed intervals; it does not catch up after app suspension or channel changes.
- Stops itself if the send API is unavailable or a send cannot be confirmed.

iOS suspends app timers in the background. This plugin cannot guarantee background sending or exact wall-clock timing while Discord is not active.

## Build

From this directory:

```sh
npm install
npm run build
```

The build creates `dist/index.js` and a hashed `dist/manifest.json`.

## Publish

Enable GitHub Pages for this repository with **Settings → Pages → Build and deployment → GitHub Actions**. The workflow publishes the contents of `ios/dist` after changes to `ios/**` reach `main`.

When deployment succeeds, add the published `manifest.json` URL as a plugin source in Endcord Mobile.
