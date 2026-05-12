"use client";

import { signOut } from "firebase/auth";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getFirebaseAuth } from "@/lib/firebase/config.js";

const sampleMessages = [
  { name: "Maya", text: "The design review is live in room alpha.", tone: "bg-teal-300 text-neutral-950" },
  { name: "Omar", text: "I pinned the Firebase rules draft.", tone: "bg-white text-neutral-950" },
  { name: "You", text: "Perfect. I am checking auth handoff now.", tone: "bg-amber-300 text-neutral-950" },
];

export function ChatDashboard() {
  const router = useRouter();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  async function handleSignOut() {
    const auth = getFirebaseAuth();

    if (auth) {
      await signOut(auth);
    }

    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-950 text-white">
        <p className="rounded-[8px] border border-white/10 bg-white/10 px-4 py-3 font-semibold">
          Loading secure session...
        </p>
      </main>
    );
  }

  const displayName = user.displayName || (user.isAnonymous ? "Guest user" : user.email?.split("@")[0]) || "Chat user";

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-6 text-white sm:px-8">
      <div className="absolute inset-0 auth-grid opacity-50" />
      <motion.section
        className="relative mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl grid-rows-[auto_1fr] overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.08] shadow-auth-pop backdrop-blur-xl"
        initial={{ opacity: 0, y: 18, rotateX: 4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.45 }}
        style={{ transformPerspective: 900 }}
      >
        <header className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-200">Pulse Chat dashboard</p>
            <h1 className="mt-1 text-2xl font-black">Hello, {displayName}</h1>
          </div>
          <button
            className="min-h-11 rounded-[8px] border border-white/15 bg-white px-4 font-black text-neutral-950"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </header>

        <div className="grid min-h-0 lg:grid-cols-[300px_1fr]">
          <aside className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-[8px] border border-teal-300/25 bg-teal-300/10 p-4">
              <p className="text-sm font-semibold text-teal-100">Signed in as</p>
              <p className="mt-2 break-words text-lg font-black">{user.email || "Anonymous guest"}</p>
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col p-5">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {sampleMessages.map((message, index) => (
                <motion.article
                  key={message.text}
                  className={`max-w-xl rounded-[8px] p-4 shadow-lg ${message.tone} ${
                    message.name === "You" ? "ml-auto" : ""
                  }`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <p className="text-sm font-black">{message.name}</p>
                  <p className="mt-2 leading-6">{message.text}</p>
                </motion.article>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <input
                className="min-h-12 flex-1 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none placeholder:text-neutral-500 focus:border-teal-300"
                placeholder="Write a message..."
                type="text"
              />
              <button className="min-h-12 rounded-[8px] bg-teal-300 px-5 font-black text-neutral-950" type="button">
                Send
              </button>
            </div>
          </section>
        </div>
      </motion.section>
    </main>
  );
}
