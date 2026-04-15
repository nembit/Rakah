# Rakah

Rakah is a standalone Expo + React Native app for tracking daily prayers and qada (make-up prayers), with local-first persistence and optional backend integrations.

Current release target: **v1.0.0**

## Highlights

- Prayer tracking across multiple screens (Home, Track, Qada, Stats).
- Local-first data model using Zustand + AsyncStorage.
- Smooth UI interactions with Reanimated and gesture support.
- Works on Android, iOS, and Web with custom polyfills where needed.
- Includes a mock backend for development and testing.

## Tech Stack

- Expo SDK 54
- React Native 0.81
- Expo Router
- Zustand (state management)
- AsyncStorage (persistence)
- React Query
- Reanimated + Gesture Handler

## Requirements

- Node.js 20+ (recommended)
- npm 10+
- Git
- Optional:
  - Android Studio (Android emulator/local native builds)
  - Expo Go (physical device testing)
  - EAS CLI (cloud builds and store artifacts)

## Quick Start

1. Clone and install dependencies:

```bash
git clone <your-repo-url>
cd Rakah
npm install
```

2. Create local environment file:

```bash
cp .env.example .env
```

3. (Optional) Start the mock backend:

```bash
npm run mock:server
```

4. Start the Expo development server:

```bash
npm run start
```

## Run Targets

- Expo Go (recommended dev flow):
  - Run `npm run start`
  - Scan QR code on your phone
- Android emulator/native:
  - Run `npm run android`
- Web:
  - Run `npm run web`

## Available Scripts

- `npm run start` - Start Expo dev server
- `npm run android` - Build/run Android locally (native)
- `npm run ios` - Build/run iOS locally (native, macOS only)
- `npm run web` - Run web target
- `npm run lint` - Run linting
- `npm run mock:server` - Start local mock API server

## Environment Variables

Configure values in `.env` (based on `.env.example`):

- `EXPO_PUBLIC_API_BASE_URL` - API base URL used by app requests
- `EXPO_PUBLIC_AUTH_BASE_URL` - Auth WebView base URL
- `EXPO_PUBLIC_AUTH_PROXY_URL` - Optional auth proxy URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Maps key (if maps enabled)
- `EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY` - Uploadcare public key fallback
- `EXPO_PUBLIC_LOGS_ENDPOINT` - Optional client log endpoint
- `EXPO_PUBLIC_LOGS_API_KEY` - Optional log API key

### Local API Note

Default value in `.env.example` is emulator-friendly:

`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api`

Use your machine LAN IP for physical-device testing.

## Mock Backend

The project includes a development mock API server at `mock-backend/server.js`.

Endpoints:

- `GET /health`
- `POST /api/upload`
- `POST /logs`

Run it with:

```bash
npm run mock:server
```

## Project Structure

```text
src/
  app/                 Expo Router screens/layouts
  components/          Shared UI components
  store/               Zustand stores
  utils/               Utilities + auth/upload helpers
  lib/                 Fetch interceptor and polyfill setup
lib/                   Error boundaries, logging, and runtime helpers
polyfills/
  web/                 Web-specific shims
  native/              Native-specific overrides
mock-backend/          Local API mock server
assets/images/         App icon/splash assets
```

## Version 1.0.0 Release Checklist (GitHub)

Before publishing the repository:

- Confirm `package.json` version is `1.0.0`
- Confirm `app.json` Expo version is `1.0.0`
- Verify app metadata:
  - name: `Rakah`
  - slug: `rakah`
  - android package: `com.rakah.app`
  - ios bundle id: `com.rakah.app`
- Ensure `.env` is not committed
- Ensure icons/splash are final in `assets/images/`
- Run smoke checks:

```bash
npm install
npm run lint
npm run start
```

Create and push a Git tag:

```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

## Play Store Readiness (AAB)

For Google Play, upload an **AAB** (not APK) using EAS Build:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile production
```

Then upload the generated AAB in Google Play Console.

## Notes

- Some platform polyfills and package patches are intentionally included for compatibility.

## License

No license file is currently included. Add one before open-source distribution (for example MIT) if you plan to make the repository public.
