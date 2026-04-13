# Rakah

Rakah is a comprehensive, dual-platform application (Web & Mobile) designed to be an elegant, premium tool for Islamic prayer (Salah) tracking and habit building. It helps individuals maintain their spiritual habits, track daily prayers, manage missed prayers (Qada), and motivates them toward perfect consistency.

## 🌟 Key Features

*   **Daily Prayer Tracking**: Dynamic calculation of exact prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) based on the user's location and preferred calculation methods.
*   **Habit Building & Gamification**: Stay motivated with continuous streak counters and milestone encouragements designed to help you build a lasting habit.
*   **Detailed Status Logging**: Log each prayer as "On Time", "Late", "Missed", or leave it "Pending".
*   **Qada Management**: Keep an accurate account of historically missed prayers and manage your journey to making them up.
*   **Actionable Analytics**: Visualize your consistency and progress over time through informative dashboards and statistics.
*   **Unified Experience**: A seamless and beautifully designed user experience across both the web and native mobile applications.

## 🛠️ Technology Stack

Rakah is built as a monorepo setup encompassing both a modern web application and a cross-platform mobile app.

### Web Application (`/web`)
A highly interactive full-stack React web application.
*   **Framework**: React 18 powered by React Router v7 and Vite.
*   **Backend & Server**: Hono server (`react-router-hono-server`) integrated with Auth.js (`@auth/core`, `@hono/auth-js`) for robust authentication.
*   **Database**: Serverless PostgreSQL via Neon Database (`@neondatabase/serverless`).
*   **Styling**: Tailwind CSS v4, supplemented with Chakra UI and framer-motion for fluid animations.
*   **State Management**: Zustand and TanStack React Query.
*   **Other Integrations**: Recharts (analytics), Three.js (3D graphics), Stripe (payments), and robust drag-and-drop features.

### Mobile Application (`/mobile`)
A feature-rich native mobile companion app for iOS and Android.
*   **Framework**: React Native (v0.81) built on Expo (v54), utilizing Expo Router for file-based navigation.
*   **Styling**: Tailwind CSS integration (via PostCSS/NativeWind) ensuring design consistency with the web platform.
*   **State Management**: Zustand and TanStack React Query, mirroring the web platform's state logic.
*   **Native Capabilities**: Deep integration with device hardware via Expo modules (Camera, Location, Haptics, Notifications, Audio/Video).
*   **Monetization**: React Native Purchases (RevenueCat) and React Native Google Mobile Ads.

## 📂 Project Structure

```
rakah/
├── mobile/       # The React Native / Expo mobile application
└── web/          # The React Router / Hono full-stack web application
```

## 🚀 Getting Started

### Prerequisites
*   Node.js (preferably the latest LTS)
*   npm, yarn, or pnpm
*   Expo CLI (for mobile development)

### Web Setup
1. Navigate to the web directory: `cd web`
2. Install dependencies: `npm install`
3. Configure your `.env` file with necessary variables (Neon DB, Auth, Stripe, etc.).
4. Start the development server: `npm run dev`

### Mobile Setup
1. Navigate to the mobile directory: `cd mobile`
2. Install dependencies: `npm install`
3. Configure your `.env` file.
4. Start the Expo development server: `npx expo start`
5. Use the Expo Go app on your physical device, or run it in an iOS Simulator / Android Emulator.
