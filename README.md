# Pulse Chat Login

Next.js App Router login flow for a chat application.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in your Firebase web app values.
3. Enable Email/Password, Google, and Anonymous sign-in in Firebase Auth.
4. Create a Firestore database.
5. Run `npm install`.
6. Run `npm run dev`.

After any user signs in for the first time, their profile is written to `/users/{uid}` in Firestore.
