# Readersity React Native

An Expo/React Native implementation of the supplied Figma flow: Splash, Home, Search, Shelf, and Book Details. App state coordinates the screens, search, selected book, and shelf; no navigation library is required.

## Project structure

```text
App.tsx                 Screen selection and shared app state
src/
  components/            Shared headers, book rows, search field, and tab bar
  data/books.ts          Book catalog, shelf entries, and image URLs
  screens/               Splash, Home, Search, Shelf, and Book Details screens
  theme/colors.ts         Shared colors and typography
```

## Run

```bash
npm install
npx expo start
```

The Expo config enables React Native's New Architecture (`newArchEnabled: true`).

## Asset handoff

The app's design images are exported from the [Readersity Figma file](https://www.figma.com/design/fSgaAS5LGgpeyrz4OClaT3/Readersity) and stored in `assets/`. The starter shelf covers are from the [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers). `src/data/books.ts` maps the local files into the app, so runtime image loading does not depend on remote image URLs.

