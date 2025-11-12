# SecureStash

A cross-platform secure file and credential manager. SecureStash stores user files and secrets with support for multiple backend providers (Supabase or Firebase) and provides mobile apps (React Native) plus a web client (Next.js).

Key goals:
- simple, secure storage for personal files
- quick uploads/downloads with soft-delete/restore
- optional server-side indexing (Supabase) or Firestore-backed mode

---

## Features

- User authentication (Firebase Auth or Supabase Auth)
- File uploads to cloud storage and automatic DB record creation
- List, preview, soft-delete and restore files
- Sorting and pagination for large lists
- Web client (Next.js) and mobile (React Native) clients
- Test coverage for core service logic and pagination helpers

---

## Quick start

Prerequisites (high level): Node.js, npm or yarn, Android Studio for Android development, Xcode for iOS development (macOS only), JDK for native builds.

1) Clone the repository

    git clone https://github.com/amnxd/SecureStash.git
    cd SecureStash

2) Install dependencies (root installs scripts and native modules)

    # install node deps
    npm install
    # or with yarn
    # yarn install

3) Configure environment

The app supports Supabase or Firebase backends. Provide the appropriate environment variables or config files before running:

- For Supabase: set SUPABASE_URL and SUPABASE_ANON_KEY (or the project's client env names used in `web-app`/`config` files).
- For Firebase: place `google-services.json` (Android) and/or `GoogleService-Info.plist` (iOS) in the platform project folders and set any Firebase config in `config/firebase.ts`.

See the `config/` folder for backend wiring.

4) Run the mobile app (React Native)

Android (Windows/Linux/macOS):

    # start Metro
    npx react-native start
    # in another terminal
    npx react-native run-android

iOS (macOS only):

    cd ios
    pod install
    cd ..
    npx react-native start
    npx react-native run-ios

5) Run the web client (Next.js)

    cd web-app
    npm install
    npm run dev
    # open http://localhost:3000

6) Tests and lint

    # run tests from repo root (if configured)
    npm test
    # or run tests in web-app
    cd web-app
    npm test

    # linting (project root or web-app as applicable)
    npm run lint

---

## Folder hierarchy (top-level)

```
.
├── App.tsx                 # React Native app entry
├── android/                # Android native project
├── ios/                    # iOS native project
├── components/             # Shared React Native components
├── config/                 # Backend and runtime configuration helpers
├── contexts/               # React contexts (Auth, State)
├── services/               # Business logic and file service helpers
├── Screens/                # React Native screens
├── web/                    # Static download page (APK, etc.)
├── web-app/                # Next.js web client (React + TypeScript)
│   ├── pages/
│   ├── components/
│   └── lib/                # web-only helpers (supabase client, cursor helpers)
├── functions/              # Cloud Functions (optional)
├── package.json
├── tsconfig.json
└── README.md
```

Note: The `web-app` directory contains the web client implementation and its own package.json for Next.js-specific dependencies.

---

## Tech stack

- React Native (mobile)
- Next.js + React (web client)
- TypeScript
- Supabase (Postgres + Storage) OR Firebase (Firestore + Storage) as optional backends
- Jest + React Testing Library for tests
- ESLint + Prettier for linting and formatting

---

## Mobile app: system requirements & setup

Minimum development environment (recommended):

- Node.js 20.x or newer
- npm (bundled) or Yarn
- Java Development Kit (JDK) 17 or newer (for Android builds)
- Android Studio with Android SDK (recommend Android API 31+ for device/emulator)
- Xcode 15+ for iOS development (macOS only)
- CocoaPods (for iOS native dependencies): `sudo gem install cocoapods` or via Bundler

Environment notes and tips:

- On Windows, set ANDROID_HOME to your Android SDK location and add `platform-tools` and `emulator` to PATH.
- On macOS, install CocoaPods and run `pod install` in `ios/` after changing native dependencies.
- Enable developer mode on your Android device and connect via USB, or configure an Android Virtual Device (AVD).
- If you use Supabase, ensure the public client keys are available to the app (or set protected server-side logic accordingly).

---

## Common scripts

From repository root you may find top-level scripts; the web client also has its own scripts under `web-app`.

Examples (web-app):

    cd web-app
    npm run dev    # start Next.js in development
    npm run build  # production build
    npm run start  # start production server
    npm test
    npm run lint

Examples (mobile):

    npx react-native start
    npx react-native run-android
    npx react-native run-ios

---

## Contributing

1. Fork and create a feature branch
2. Run tests and lint locally
3. Open a pull request with a description of your changes

If you plan to contribute to native modules or CI config, describe your environment in the PR.

---

## License

MIT — see the `LICENSE` file.

---

If you want me to add badges, screenshots, or a short DEVELOPING.md with detailed environment setup (for example a step-by-step Android Studio and AVD setup for Windows), tell me which platform(s) to prioritize and I'll add it.
# SecureStash

A React Native application for secure password and credential management with a modern, user-friendly interface.

##  Features

- **User Authentication**: Signup and Login screens with secure password handling
- **Modern UI**: Clean, responsive design with green-themed branding
- **Navigation**: Smooth screen transitions using React Navigation
- **Cross-Platform**: Works on both Android and iOS

##  Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 20 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **React Native CLI** - Install globally: `npm install -g @react-native-community/cli`
- **Android Studio** (for Android development) - [Download here](https://developer.android.com/studio)
- **Xcode** (for iOS development, macOS only) - Available on Mac App Store
- **Java Development Kit (JDK)** - Version 17 or higher
- **Android SDK** - Install via Android Studio

##  Installation Steps

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/amnxd/SecureStash
cd SecureStash

# If you're working with a specific branch
git checkout <branch-name>
```

### Step 2: Install Dependencies

## Backend (Firebase) Setup

This app uses Firebase Auth, Firestore, Storage, and Cloud Functions.

Prereqs:
- Node 20+
- Firebase CLI installed and logged in

Steps:
1) Create a Firebase project in the Console. Enable Authentication (Email/Password), Firestore, and Storage.
2) Put your Android google-services.json into `android/app/google-services.json` (already present) and iOS GoogleService-Info.plist into Xcode project if building for iOS.
3) Set your project ID in `.firebaserc` and in `config/backend.ts` (FIREBASE_PROJECT_ID).
4) Deploy rules and functions:
    - Install function deps and build:
       - cd functions && npm install && npm run build
    - From project root:
       - firebase deploy --only firestore:rules,storage:rules,functions

Local emulation:
- firebase emulators:start

Frontend usage:
- Use helpers in `components/backendClient.ts` to call callable functions and HTTP endpoint.

Data model and rules: see `Backend-Schema.md`.

```bash
# Install all npm dependencies
npm install
```

**Note**: If you encounter any JSON parsing errors during installation, check the `package.json` file for syntax errors (like trailing commas).

### Step 3: Install React Native Dependencies

The project requires additional React Native dependencies for navigation:

```bash
# Install React Navigation dependencies
npm install @react-navigation/native @react-navigation/native-stack

# Install required native dependencies
npm install react-native-screens react-native-gesture-handler react-native-safe-area-context
```

### Step 4: Android Setup

#### 4.1 Configure Android Environment

1. **Set up Android SDK**:
   - Open Android Studio
   - Go to Settings/Preferences → Appearance & Behavior → System Settings → Android SDK
   - Install Android SDK Platform 34 (API Level 34)
   - Install Android SDK Build-Tools 34.0.0

2. **Set Environment Variables** (Windows):
   ```bash
   # Add these to your system environment variables
   ANDROID_HOME=C:\Users\<YourUsername>\AppData\Local\Android\Sdk
   PATH=%PATH%;%ANDROID_HOME%\platform-tools
   PATH=%PATH%;%ANDROID_HOME%\tools
   ```

3. **Set Environment Variables** (macOS/Linux):
   ```bash
   # Add to your ~/.bash_profile or ~/.zshrc
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

#### 4.2 Create Android Virtual Device (AVD)

1. Open Android Studio
2. Go to Tools → AVD Manager
3. Click "Create Virtual Device"
4. Select a device (e.g., Pixel 9a)
5. Select a system image (e.g., API 34)
6. Click "Finish"

### Step 5: iOS Setup (macOS only)

```bash
# Install iOS dependencies
cd ios
pod install
cd ..
```

## 🚀 Running the Application

### Option 1: Run on Android

```bash
# Start the Metro bundler (in a separate terminal)
npx react-native start

# In another terminal, run the Android app
npx react-native run-android
```

**Alternative (single command)**:
```bash
# This will start Metro and run the app
npx react-native run-android

```
