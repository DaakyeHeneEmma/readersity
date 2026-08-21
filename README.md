# Readersity React Native

An Expo/React Native implementation of the supplied Figma flow: Splash, Home, Search, Shelf, and Book Details. The app uses local state for navigation, search, and adding the featured title to the shelf—no navigation library is required.

## Run

```bash
npm install
npx expo start
```

The Expo config enables React Native's New Architecture (`newArchEnabled: true`).

## Asset handoff

`App.tsx` centralizes the Figma-exported asset URLs in `asset`. They expire after roughly seven days. The Figma connector exposed them, but this environment could not download them owing to a TLS credential error. Before release, download the original exported bytes from Figma and replace each URI with a `require('./assets/...')` reference; no visual asset should be redrawn.

