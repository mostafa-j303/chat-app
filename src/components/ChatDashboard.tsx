"use client";

import { signOut } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getFirebaseAuth } from "@/lib/firebase/config.js";

type Gender = "Female" | "Male" | "Non-binary";

type OnlineUser = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  locationCookie: string;
  unread: number;
  accent: string;
};

type ChatMessage = {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
};

const onlineUsers: OnlineUser[] = [
  {
    id: "maya",
    name: "Maya",
    age: 27,
    gender: "Female",
    locationCookie: "countryCode=LB",
    unread: 3,
    accent: "bg-teal-300",
  },
  {
    id: "omar",
    name: "Omar",
    age: 31,
    gender: "Male",
    locationCookie: "location=%7B%22countryCode%22%3A%22AE%22%7D",
    unread: 0,
    accent: "bg-amber-300",
  },
  {
    id: "lina",
    name: "Lina",
    age: 24,
    gender: "Female",
    locationCookie: "cf-ipcountry=FR",
    unread: 8,
    accent: "bg-rose-300",
  },
  {
    id: "sam",
    name: "Sam",
    age: 29,
    gender: "Non-binary",
    locationCookie: "country=CA",
    unread: 1,
    accent: "bg-cyan-300",
  },
];

const initialConversations: Record<string, ChatMessage[]> = {
  maya: [
    { id: "maya-1", sender: "them", text: "Hey, are you online for a quick chat?", time: "09:41" },
    { id: "maya-2", sender: "them", text: "I saved the room for us.", time: "09:42" },
    { id: "maya-3", sender: "me", text: "Yes, I am here now.", time: "09:44" },
  ],
  omar: [
    { id: "omar-1", sender: "them", text: "The dashboard looks much cleaner today.", time: "08:15" },
    { id: "omar-2", sender: "me", text: "Good. I am polishing the chat list next.", time: "08:17" },
  ],
  lina: [
    { id: "lina-1", sender: "them", text: "I sent you the notes.", time: "11:02" },
    { id: "lina-2", sender: "them", text: "Can you check the last two points?", time: "11:04" },
  ],
  sam: [{ id: "sam-1", sender: "them", text: "Ping me when you are free.", time: "12:20" }],
};

const countryNames: Record<string, string> = {
  lebanon: "LB",
  "united arab emirates": "AE",
  emirates: "AE",
  france: "FR",
  canada: "CA",
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
};

function parseCookies(cookieString: string) {
  return cookieString
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, cookie) => {
      const [key, ...valueParts] = cookie.split("=");
      cookies[key] = valueParts.join("=");
      return cookies;
    }, {});
}

function normalizeCountryCode(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const decodedValue = decodeURIComponent(value).trim();

  if (/^[a-z]{2}$/i.test(decodedValue)) {
    return decodedValue.toUpperCase();
  }

  const mappedCountry = countryNames[decodedValue.toLowerCase()];

  if (mappedCountry) {
    return mappedCountry;
  }

  try {
    const parsedValue = JSON.parse(decodedValue) as Record<string, unknown>;
    const nestedValue =
      parsedValue.countryCode ||
      parsedValue.country_code ||
      parsedValue.country ||
      parsedValue.countryName ||
      parsedValue.country_name;

    return typeof nestedValue === "string" ? normalizeCountryCode(nestedValue) : null;
  } catch {
    return null;
  }
}

function getCountryCodeFromLocationCookie(cookieString: string) {
  const cookies = parseCookies(cookieString);
  const directKeys = ["countryCode", "country_code", "country", "geo_country", "location_country", "cf-ipcountry"];

  for (const key of directKeys) {
    const code = normalizeCountryCode(cookies[key]);

    if (code) {
      return code;
    }
  }

  for (const value of Object.values(cookies)) {
    const code = normalizeCountryCode(value);

    if (code) {
      return code;
    }
  }

  return null;
}

function countryCodeToFlag(countryCode: string | null) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return "??";
  }

  return countryCode
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

function countMyMessagesWaiting(messages: ChatMessage[]) {
  let count = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].sender !== "me") {
      break;
    }

    count += 1;
  }

  return count;
}

export function ChatDashboard() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [selectedUserId, setSelectedUserId] = useState(onlineUsers[0].id);
  const [users, setUsers] = useState(onlineUsers);
  const [conversations, setConversations] = useState(initialConversations);
  const [draft, setDraft] = useState("");
  const [browserLocationCookie, setBrowserLocationCookie] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    setBrowserLocationCookie(document.cookie);
  }, []);

  async function handleSignOut() {
    const auth = getFirebaseAuth();

    if (auth) {
      await signOut(auth);
    }

    router.replace("/login");
  }

  function handleSelectUser(userId: string) {
    setSelectedUserId(userId);
    setDraft("");
    setUsers((currentUsers) =>
      currentUsers.map((onlineUser) => (onlineUser.id === userId ? { ...onlineUser, unread: 0 } : onlineUser)),
    );
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeUser || !canSend || !draft.trim()) {
      return;
    }

    const message: ChatMessage = {
      id: `${activeUser.id}-${Date.now()}`,
      sender: "me",
      text: draft.trim(),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()),
    };

    setConversations((currentConversations) => ({
      ...currentConversations,
      [activeUser.id]: [...(currentConversations[activeUser.id] || []), message],
    }));
    setDraft("");
  }

  const sortedUsers = useMemo(
    () => [...users].sort((firstUser, secondUser) => secondUser.unread - firstUser.unread),
    [users],
  );
  const displayName = user?.displayName || (user?.isAnonymous ? "Guest user" : user?.email?.split("@")[0]) || "Chat user";
  const activeUser = users.find((onlineUser) => onlineUser.id === selectedUserId);
  const activeMessages = activeUser ? conversations[activeUser.id] || [] : [];
  const waitingMessageCount = countMyMessagesWaiting(activeMessages);
  const canSend = waitingMessageCount < 2;
  const remainingMessageCount = Math.max(0, 2 - waitingMessageCount);
  const totalUnread = users.reduce((total, onlineUser) => total + onlineUser.unread, 0);
  const viewerFlag = countryCodeToFlag(getCountryCodeFromLocationCookie(browserLocationCookie));
  const selectedCountryCode = activeUser
    ? getCountryCodeFromLocationCookie(activeUser.locationCookie || browserLocationCookie)
    : null;

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-950 text-white">
        <p className="rounded-[8px] border border-white/10 bg-white/10 px-4 py-3 font-semibold">
          Loading secure session...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-neutral-950 px-4 py-5 text-white sm:px-6">
      <div className="absolute inset-0 auth-grid opacity-50" />
      <motion.section
        className="relative mx-auto grid min-h-[calc(100vh-40px)] max-w-7xl grid-rows-[auto_1fr] overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.08] shadow-auth-pop backdrop-blur-xl"
        initial={{ opacity: 0, y: 18, rotateX: 4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.45 }}
        style={{ transformPerspective: 900 }}
      >
        <header className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-semibold text-teal-200">Pulse Chat dashboard</p>
            <h1 className="mt-1 text-2xl font-black">Hello, {displayName}</h1>
            <p className="mt-2 text-sm font-semibold text-neutral-300">
              {viewerFlag} {totalUnread ? `${totalUnread} unread messages` : "No unread messages"}
            </p>
          </div>
          <button
            className="min-h-11 rounded-[8px] border border-white/15 bg-white px-4 font-black text-neutral-950"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </header>

        <div className="grid min-h-0 lg:grid-cols-[360px_1fr]">
          <aside className="min-h-0 border-b border-white/10 p-4 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="mb-4 rounded-[8px] border border-teal-300/25 bg-teal-300/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-teal-100">Online users</p>
                  <p className="mt-2 text-3xl font-black">{users.length}</p>
                </div>
                <span className="rounded-[8px] bg-white px-3 py-2 text-sm font-black text-neutral-950">Live</span>
              </div>
            </div>

            <div className="grid max-h-[calc(100vh-230px)] gap-3 overflow-y-auto pr-1">
              {sortedUsers.map((onlineUser) => {
                const countryCode = getCountryCodeFromLocationCookie(onlineUser.locationCookie || browserLocationCookie);
                const isSelected = onlineUser.id === selectedUserId;

                return (
                  <motion.button
                    key={onlineUser.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectUser(onlineUser.id)}
                    className={`relative grid min-h-[96px] grid-cols-[52px_1fr] gap-3 rounded-[8px] border p-3 text-left transition ${
                      isSelected
                        ? "border-teal-300 bg-teal-300/15"
                        : "border-white/10 bg-neutral-950/60 hover:border-white/25"
                    }`}
                    whileHover={{ y: -2, rotateX: 2, rotateY: -1 }}
                    whileTap={{ scale: 0.99 }}
                    style={{ transformPerspective: 900 }}
                  >
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-[8px] ${onlineUser.accent} text-lg font-black text-neutral-950`}
                    >
                      {onlineUser.name.slice(0, 1)}
                    </span>

                    <span className="min-w-0">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-base font-black text-white">{onlineUser.name}</span>
                          <span className="mt-1 block text-sm font-semibold text-neutral-300">
                            {countryCodeToFlag(countryCode)} {onlineUser.age} years old
                          </span>
                        </span>
                        <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                      </span>

                      <span className="mt-2 block text-sm font-semibold text-neutral-400">{onlineUser.gender}</span>
                    </span>

                    {onlineUser.unread ? (
                      <span className="absolute right-10 top-3 grid min-h-7 min-w-7 place-items-center rounded-full bg-red-500 px-2 text-sm font-black text-white shadow-[0_0_22px_rgba(239,68,68,0.75)]">
                        {onlineUser.unread}
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-[560px] min-w-0 flex-col">
            {activeUser ? (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid h-14 w-14 shrink-0 place-items-center rounded-[8px] ${activeUser.accent} text-xl font-black text-neutral-950`}
                    >
                      {activeUser.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black">{activeUser.name}</h2>
                      <p className="mt-1 text-sm font-semibold text-neutral-300">
                        {countryCodeToFlag(selectedCountryCode)} {activeUser.age} years old · {activeUser.gender}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[8px] border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm font-black">
                    {canSend ? `${remainingMessageCount} message${remainingMessageCount === 1 ? "" : "s"} available` : `Waiting for ${activeUser.name}`}
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  <AnimatePresence mode="popLayout">
                    {activeMessages.map((message, index) => {
                      const isMine = message.sender === "me";

                      return (
                        <motion.article
                          key={message.id}
                          className={`max-w-[78%] rounded-[8px] p-4 shadow-lg ${
                            isMine ? "ml-auto bg-teal-300 text-neutral-950" : "bg-white text-neutral-950"
                          }`}
                          initial={{ opacity: 0, y: 18, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-black">{isMine ? "You" : activeUser.name}</p>
                            <p className="text-xs font-bold opacity-70">{message.time}</p>
                          </div>
                          <p className="mt-2 leading-6">{message.text}</p>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <form className="border-t border-white/10 p-4" onSubmit={handleSendMessage}>
                  {!canSend ? (
                    <p className="mb-3 rounded-[8px] border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">
                      You sent two messages. {activeUser.name} needs to reply before you can send another one.
                    </p>
                  ) : null}

                  <div className="flex gap-3">
                    <input
                      className="min-h-12 min-w-0 flex-1 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none placeholder:text-neutral-500 focus:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={`Message ${activeUser.name}`}
                      type="text"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      disabled={!canSend}
                    />
                    <motion.button
                      className="min-h-12 rounded-[8px] bg-teal-300 px-5 font-black text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={!canSend || !draft.trim()}
                      whileHover={canSend && draft.trim() ? { y: -2, rotateX: 3, rotateY: -2 } : undefined}
                      whileTap={{ scale: 0.98 }}
                      style={{ transformPerspective: 900 }}
                    >
                      Send
                    </motion.button>
                  </div>
                </form>
              </>
            ) : null}
          </section>
        </div>
      </motion.section>
    </main>
  );
}
