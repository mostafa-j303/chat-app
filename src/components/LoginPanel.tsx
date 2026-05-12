"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatedChatScene } from "@/components/AnimatedChatScene";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getFirebaseAuth, getGoogleProvider, getMissingFirebaseEnv } from "@/lib/firebase/config.js";
import { createGuestUsername, ensureUserProfile } from "@/lib/firebase/users.js";

type AuthMode = "login" | "signup";

const popMotion = {
  scale: 1.03,
  y: -4,
  rotateX: 4,
  rotateY: -3,
};

function getFriendlyError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/invalid-credential") {
      return "The email or password does not match an account.";
    }

    if (error.code === "auth/email-already-in-use") {
      return "That email already has an account. Try signing in instead.";
    }

    if (error.code === "auth/popup-closed-by-user") {
      return "The Google sign-in window was closed before it finished.";
    }

    if (error.code === "auth/weak-password") {
      return "Use at least 6 characters for your password.";
    }
  }

  if (error instanceof Error && error.message.startsWith("Missing Firebase configuration")) {
    return error.message;
  }

  return "Something went wrong while signing you in.";
}

function requireFirebaseAuth() {
  const auth = getFirebaseAuth();

  if (!auth) {
    throw new Error(`Missing Firebase configuration: ${getMissingFirebaseEnv().join(", ")}`);
  }

  return auth;
}

export function LoginPanel() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim() || busyAction) {
      return false;
    }

    if (!isSignup) {
      return true;
    }

    return Boolean(username.trim() && gender && age);
  }, [age, busyAction, email, gender, isSignup, password, username]);

  useEffect(() => {
    if (!loading && user && !busyAction) {
      router.replace("/dashboard");
    }
  }, [busyAction, loading, router, user]);

  async function completeLogin(currentUser: Parameters<typeof ensureUserProfile>[0], metadata = {}) {
    await ensureUserProfile(currentUser, metadata);
    router.push("/dashboard");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusyAction("email");

    try {
      const auth = requireFirebaseAuth();

      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const cleanUsername = username.trim();

        await updateProfile(credential.user, { displayName: cleanUsername });
        await completeLogin(credential.user, {
          username: cleanUsername,
          gender,
          age: Number(age),
          authProvider: "password",
        });
        return;
      }

      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await completeLogin(credential.user, {
        username: credential.user.displayName || email.split("@")[0],
        authProvider: "password",
      });
    } catch (caughtError) {
      setError(getFriendlyError(caughtError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setBusyAction("google");

    try {
      const auth = requireFirebaseAuth();
      const credential = await signInWithPopup(auth, getGoogleProvider());
      await completeLogin(credential.user, {
        username: credential.user.displayName || credential.user.email?.split("@")[0],
        gender: "not_provided",
        age: null,
        authProvider: "google.com",
      });
    } catch (caughtError) {
      setError(getFriendlyError(caughtError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGuestLogin() {
    setError("");
    setBusyAction("guest");

    try {
      const auth = requireFirebaseAuth();
      const credential = await signInAnonymously(auth);
      const guestUsername = createGuestUsername();
      await completeLogin(credential.user, {
        username: guestUsername,
        gender: "not_provided",
        age: null,
        authProvider: "anonymous",
      });
    } catch (caughtError) {
      setError(getFriendlyError(caughtError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-white">
      <div className="absolute inset-0 auth-grid opacity-70" />
      <motion.div
        className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-teal-300/20 via-amber-200/10 to-transparent"
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.section
        className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_440px]"
        initial={{ opacity: 0, y: 22, rotateX: 5 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="max-w-2xl">
          <motion.p
            className="mb-4 inline-flex rounded-[8px] border border-teal-300/35 bg-teal-300/10 px-3 py-2 text-sm font-semibold text-teal-100"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            Pulse Chat
          </motion.p>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] sm:text-5xl lg:text-6xl">
            Sign in and jump back into the conversation.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-neutral-300 sm:text-lg">
            Use Google, email and password, or a temporary guest identity. New profiles are saved to
            Firestore the first time they arrive.
          </p>
          <AnimatedChatScene />
        </div>

        <motion.div
          className="rounded-[8px] border border-white/15 bg-white/[0.08] p-5 shadow-auth-pop backdrop-blur-xl sm:p-6"
          whileHover={popMotion}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{ transformPerspective: 900 }}
        >
          <div className="mb-6">
            <p className="text-sm font-semibold text-teal-200">Secure access</p>
            <h2 className="mt-2 text-2xl font-black">{isSignup ? "Create account" : "Welcome back"}</h2>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-[8px] border border-white/10 bg-neutral-950/60 p-1">
            {(["login", "signup"] as AuthMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setError("");
                }}
                className={`rounded-[6px] px-3 py-2 text-sm font-bold transition ${
                  mode === item ? "bg-white text-neutral-950" : "text-neutral-300 hover:text-white"
                }`}
              >
                {item === "login" ? "Sign in" : "New account"}
              </button>
            ))}
          </div>

          <form className="grid gap-4" onSubmit={handleEmailSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-neutral-200">
              Email
              <input
                className="min-h-12 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none transition placeholder:text-neutral-500 focus:border-teal-300"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-neutral-200">
              Password
              <input
                className="min-h-12 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none transition placeholder:text-neutral-500 focus:border-teal-300"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </label>

            <AnimatePresence initial={false}>
              {isSignup ? (
                <motion.div
                  className="grid gap-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="grid gap-2 text-sm font-semibold text-neutral-200">
                    Username
                    <input
                      className="min-h-12 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none transition placeholder:text-neutral-500 focus:border-teal-300"
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Chat name"
                      autoComplete="nickname"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-neutral-200">
                      Gender
                      <select
                        className="min-h-12 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none transition focus:border-teal-300"
                        value={gender}
                        onChange={(event) => setGender(event.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="non_binary">Non-binary</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-neutral-200">
                      Age
                      <input
                        className="min-h-12 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none transition placeholder:text-neutral-500 focus:border-teal-300"
                        type="number"
                        min="13"
                        max="120"
                        value={age}
                        onChange={(event) => setAge(event.target.value)}
                        placeholder="21"
                      />
                    </label>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {error ? (
              <motion.p
                className="rounded-[8px] border border-rose-300/40 bg-rose-300/10 p-3 text-sm font-semibold text-rose-100"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            ) : null}

            <motion.button
              type="submit"
              disabled={!canSubmit}
              className="min-h-12 rounded-[8px] bg-teal-300 px-4 font-black text-neutral-950 shadow-chat-glow transition disabled:cursor-not-allowed disabled:opacity-50"
              whileHover={canSubmit ? popMotion : undefined}
              whileTap={{ scale: 0.98 }}
              style={{ transformPerspective: 900 }}
            >
              {busyAction === "email" ? "Connecting..." : isSignup ? "Create account" : "Continue"}
            </motion.button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold text-neutral-400">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid gap-3">
            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              disabled={Boolean(busyAction)}
              className="min-h-12 rounded-[8px] border border-white/15 bg-white px-4 font-black text-neutral-950 transition disabled:cursor-not-allowed disabled:opacity-60"
              whileHover={!busyAction ? popMotion : undefined}
              whileTap={{ scale: 0.98 }}
              style={{ transformPerspective: 900 }}
            >
              {busyAction === "google" ? "Opening Google..." : "Continue with Google"}
            </motion.button>

            <motion.button
              type="button"
              onClick={handleGuestLogin}
              disabled={Boolean(busyAction)}
              className="min-h-12 rounded-[8px] border border-amber-200/35 bg-amber-300/15 px-4 font-black text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
              whileHover={!busyAction ? popMotion : undefined}
              whileTap={{ scale: 0.98 }}
              style={{ transformPerspective: 900 }}
            >
              {busyAction === "guest" ? "Creating guest..." : "Enter as Guest"}
            </motion.button>
          </div>
        </motion.div>
      </motion.section>
    </main>
  );
}
