"use client";

import { signOut } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  MESSAGE_STREAK_LIMIT,
  buildDirectChatId,
  ensureDirectChat,
  markChatRead,
  sendDirectMessage,
  setCurrentUserOffline,
  setCurrentUserOnline,
  subscribeChatMessages,
  subscribeOnlineUsers,
  subscribeUserChats,
  type ChatMessage,
  type ChatSummary,
  type UserProfile,
} from "@/lib/firebase/chat";
import { getFirebaseAuth } from "@/lib/firebase/config.js";
import { countryCodeToFlag, getCountryCodeFromLocationCookie } from "@/lib/location/country";
import { useAuthUser } from "@/hooks/useAuthUser";

function getFriendlyError(error: unknown) {
  if (error instanceof Error && error.message === "MESSAGE_LIMIT_REACHED") {
    return "You sent two messages. Wait for the other person to reply.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while loading chat.";
}

function formatAge(age: UserProfile["age"]) {
  return typeof age === "number" && Number.isFinite(age) ? `${age} years old` : "Age not set";
}

function formatGender(gender: UserProfile["gender"]) {
  return gender && gender !== "not_provided" ? gender.replaceAll("_", " ") : "Gender not set";
}

function getProfileName(profile: UserProfile) {
  return profile.username || profile.displayName || profile.email?.split("@")[0] || `User_${profile.uid.slice(0, 5)}`;
}

function getInitial(profile: UserProfile) {
  return getProfileName(profile).slice(0, 1).toUpperCase();
}

function formatMessageTime(message: ChatMessage) {
  if (!message.createdAt) {
    return "Sending";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(message.createdAt.toDate());
}

function countMyWaitingMessages(messages: ChatMessage[], uid: string | undefined) {
  if (!uid) {
    return 0;
  }

  let count = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].senderId !== uid) {
      break;
    }

    count += 1;
  }

  return count;
}

export function ChatDashboard() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const currentUser = user;
    const countryCode = getCountryCodeFromLocationCookie(document.cookie);

    function touchPresence() {
      setCurrentUserOnline(currentUser, countryCode).catch((error: unknown) => {
        setDashboardError(getFriendlyError(error));
      });
    }

    touchPresence();
    const heartbeat = window.setInterval(touchPresence, 25000);
    const markOffline = () => {
      setCurrentUserOffline(currentUser.uid).catch(() => undefined);
    };

    window.addEventListener("beforeunload", markOffline);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    try {
      const unsubscribeUsers = subscribeOnlineUsers(user.uid, setOnlineUsers, setDashboardError);
      const unsubscribeChats = subscribeUserChats(user.uid, setChatSummaries, setDashboardError);

      return () => {
        unsubscribeUsers();
        unsubscribeChats();
      };
    } catch (error) {
      setDashboardError(getFriendlyError(error));
      return undefined;
    }
  }, [user]);

  useEffect(() => {
    if (!onlineUsers.length) {
      setSelectedUserId(null);
      return;
    }

    const selectedUserStillOnline = onlineUsers.some((onlineUser) => onlineUser.uid === selectedUserId);

    if (!selectedUserId || !selectedUserStillOnline) {
      setSelectedUserId(onlineUsers[0].uid);
    }
  }, [onlineUsers, selectedUserId]);

  const unreadByUserId = useMemo(() => {
    if (!user) {
      return {};
    }

    return chatSummaries.reduce<Record<string, number>>((unreadMap, chat) => {
      const otherUserId = chat.participants.find((participantId) => participantId !== user.uid);

      if (otherUserId) {
        unreadMap[otherUserId] = chat.unreadCounts?.[user.uid] || 0;
      }

      return unreadMap;
    }, {});
  }, [chatSummaries, user]);

  const sortedOnlineUsers = useMemo(
    () =>
      [...onlineUsers].sort((firstUser, secondUser) => {
        const unreadDifference = (unreadByUserId[secondUser.uid] || 0) - (unreadByUserId[firstUser.uid] || 0);

        if (unreadDifference) {
          return unreadDifference;
        }

        return getProfileName(firstUser).localeCompare(getProfileName(secondUser));
      }),
    [onlineUsers, unreadByUserId],
  );

  const activeUser = useMemo(
    () => onlineUsers.find((onlineUser) => onlineUser.uid === selectedUserId) || null,
    [onlineUsers, selectedUserId],
  );

  const activeChat = useMemo(
    () => chatSummaries.find((chat) => chat.id === activeChatId) || null,
    [activeChatId, chatSummaries],
  );

  const displayName = user?.displayName || (user?.isAnonymous ? "Guest user" : user?.email?.split("@")[0]) || "Chat user";
  const totalUnread = Object.values(unreadByUserId).reduce((total, unread) => total + unread, 0);
  const currentWaitingCount =
    user && activeChat
      ? activeChat.waitingStreak?.[user.uid] || 0
      : countMyWaitingMessages(activeMessages, user?.uid);
  const remainingMessageCount = Math.max(0, MESSAGE_STREAK_LIMIT - currentWaitingCount);
  const directChatId = user && activeUser ? buildDirectChatId(user.uid, activeUser.uid) : null;
  const canSend = Boolean(activeUser && remainingMessageCount > 0 && directChatId && !sending);
  const canType = Boolean(activeUser && remainingMessageCount > 0 && !sending);

  useEffect(() => {
    if (!user || !activeUser) {
      setActiveChatId(null);
      setActiveMessages([]);
      return undefined;
    }

    let canceled = false;
    setChatLoading(true);
    setDashboardError("");

    ensureDirectChat(user, activeUser)
      .then((chatId) => {
        if (canceled) {
          return;
        }

        setActiveChatId(chatId);
        return markChatRead(chatId, user.uid);
      })
      .catch((error: unknown) => setDashboardError(getFriendlyError(error)))
      .finally(() => {
        if (!canceled) {
          setChatLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [activeUser, user]);

  useEffect(() => {
    if (!activeChatId) {
      setActiveMessages([]);
      return undefined;
    }

    try {
      return subscribeChatMessages(activeChatId, setActiveMessages, setDashboardError);
    } catch (error) {
      setDashboardError(getFriendlyError(error));
      return undefined;
    }
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId || !user || !activeMessages.length) {
      return;
    }

    markChatRead(activeChatId, user.uid).catch((error: unknown) => setDashboardError(getFriendlyError(error)));
  }, [activeChatId, activeMessages.length, user]);

  async function handleSignOut() {
    if (user) {
      await setCurrentUserOffline(user.uid).catch(() => undefined);
    }

    const auth = getFirebaseAuth();

    if (auth) {
      await signOut(auth);
    }

    router.replace("/login");
  }

  function handleSelectUser(userId: string) {
    setSelectedUserId(userId);
    setDraft("");
    setDashboardError("");
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !activeUser || !draft.trim() || !canSend) {
      return;
    }

    const chatId = activeChatId ?? directChatId;

    if (!chatId) {
      return;
    }

    setSending(true);
    setDashboardError("");

    try {
      const resolvedChatId = await ensureDirectChat(user, activeUser);
      setActiveChatId(resolvedChatId);
      await sendDirectMessage({
        chatId: resolvedChatId,
        senderId: user.uid,
        recipientId: activeUser.uid,
        text: draft.trim(),
      });
      setDraft("");
    } catch (error) {
      const message = getFriendlyError(error);
      setDashboardError(message);
      console.error("Chat send error:", error);
    } finally {
      setSending(false);
    }
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
              {totalUnread ? `${totalUnread} unread messages` : "No unread messages"}
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
                  <p className="mt-2 text-3xl font-black">{onlineUsers.length}</p>
                </div>
                <span className="rounded-[8px] bg-white px-3 py-2 text-sm font-black text-neutral-950">Live</span>
              </div>
            </div>

            {dashboardError ? (
              <p className="mb-4 rounded-[8px] border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">
                {dashboardError}
              </p>
            ) : null}

            {sortedOnlineUsers.length ? (
              <div className="grid max-h-[calc(100vh-260px)] gap-3 overflow-y-auto pr-1">
                {sortedOnlineUsers.map((onlineUser) => {
                  const unreadCount = unreadByUserId[onlineUser.uid] || 0;
                  const isSelected = onlineUser.uid === selectedUserId;
                  const flag = countryCodeToFlag(onlineUser.countryCode);

                  return (
                    <motion.button
                      key={onlineUser.uid}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectUser(onlineUser.uid)}
                      className={`relative grid min-h-[100px] grid-cols-[52px_1fr] gap-3 rounded-[8px] border p-3 text-left transition ${
                        isSelected
                          ? "border-teal-300 bg-teal-300/15"
                          : "border-white/10 bg-neutral-950/60 hover:border-white/25"
                      }`}
                      whileHover={{ y: -2, rotateX: 2, rotateY: -1 }}
                      whileTap={{ scale: 0.99 }}
                      style={{ transformPerspective: 900 }}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-[8px] bg-teal-300 text-lg font-black text-neutral-950">
                        {getInitial(onlineUser)}
                      </span>

                      <span className="min-w-0">
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-base font-black text-white">
                              {getProfileName(onlineUser)}
                            </span>
                            <span className="mt-1 block text-sm font-semibold text-neutral-300">
                              {flag} {formatAge(onlineUser.age)}
                            </span>
                          </span>
                          <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                        </span>

                        <span className="mt-2 block text-sm font-semibold capitalize text-neutral-400">
                          {formatGender(onlineUser.gender)}
                        </span>
                      </span>

                      {unreadCount ? (
                        <span className="absolute right-10 top-3 grid min-h-7 min-w-7 place-items-center rounded-full bg-red-500 px-2 text-sm font-black text-white shadow-[0_0_22px_rgba(239,68,68,0.75)]">
                          {unreadCount}
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[8px] border border-white/10 bg-neutral-950/60 p-5 text-center">
                <p className="text-lg font-black">No one else is online</p>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  Open the app with another Firebase user to start a real one-on-one chat.
                </p>
              </div>
            )}
          </aside>

          <section className="flex min-h-[560px] min-w-0 flex-col">
            {activeUser ? (
              <>
                <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] bg-teal-300 text-xl font-black text-neutral-950">
                      {getInitial(activeUser)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-black">{getProfileName(activeUser)}</h2>
                      <p className="mt-1 text-sm font-semibold capitalize text-neutral-300">
                        {countryCodeToFlag(activeUser.countryCode)} {formatAge(activeUser.age)} ·{" "}
                        {formatGender(activeUser.gender)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[8px] border border-white/10 bg-neutral-950/60 px-4 py-3 text-sm font-black">
                    {remainingMessageCount
                      ? `${remainingMessageCount} message${remainingMessageCount === 1 ? "" : "s"} available`
                      : `Waiting for ${getProfileName(activeUser)}`}
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {chatLoading ? (
                    <p className="rounded-[8px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold">
                      Opening chat...
                    </p>
                  ) : null}

                  {!chatLoading && !activeMessages.length ? (
                    <div className="grid h-full min-h-[300px] place-items-center rounded-[8px] border border-white/10 bg-neutral-950/40 p-5 text-center">
                      <div>
                        <p className="text-xl font-black">No messages yet</p>
                        <p className="mt-2 text-sm text-neutral-400">Start the conversation with {getProfileName(activeUser)}.</p>
                      </div>
                    </div>
                  ) : null}

                  <AnimatePresence mode="popLayout">
                    {activeMessages.map((message) => {
                      const isMine = message.senderId === user.uid;

                      return (
                        <motion.article
                          key={message.id}
                          className={`max-w-[78%] rounded-[8px] p-4 shadow-lg ${
                            isMine ? "ml-auto bg-teal-300 text-neutral-950" : "bg-white text-neutral-950"
                          }`}
                          initial={{ opacity: 0, y: 18, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8 }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-black">{isMine ? "You" : getProfileName(activeUser)}</p>
                            <p className="text-xs font-bold opacity-70">{formatMessageTime(message)}</p>
                          </div>
                          <p className="mt-2 leading-6">{message.text}</p>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <form className="border-t border-white/10 p-4" onSubmit={handleSendMessage}>
                  {!remainingMessageCount ? (
                    <p className="mb-3 rounded-[8px] border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">
                      You sent two messages. {getProfileName(activeUser)} needs to reply before you can send another one.
                    </p>
                  ) : null}

                  <div className="flex gap-3">
                    <input
                      className="min-h-12 min-w-0 flex-1 rounded-[8px] border border-white/10 bg-neutral-950/70 px-4 text-white outline-none placeholder:text-neutral-500 focus:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={`Message ${getProfileName(activeUser)}`}
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
                      {sending ? "Sending" : "Send"}
                    </motion.button>
                  </div>
                </form>
              </>
            ) : (
              <div className="grid min-h-[560px] place-items-center p-5 text-center">
                <div>
                  <p className="text-2xl font-black">Waiting for online users</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-neutral-400">
                    The roster is connected to Firestore now. When another authenticated user opens the dashboard,
                    they will appear here.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </motion.section>
    </main>
  );
}
