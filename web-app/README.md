# SecureStash Web (Next.js)

This folder contains a Next.js TypeScript web client that mirrors the mobile SecureStash app and connects to the same Supabase/Firebase backend.

Getting started

1. Copy environment variables into `.env.local` at the `web-app` root (create if missing):

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

2. Install dependencies

```bash
cd web-app
npm install
```

3. Run dev server

```bash
npm run dev
```

Notes

- This is a scaffold: adapt the Supabase table and storage names to match your backend schema. The `supabaseClient` and `firebaseClient` files load config from env vars.
- I intentionally left placeholders for more advanced features: sharing, offline, and file encryption. I can wire these next once you provide credentials and confirm DB schema.
