"use client";

import { motion } from "framer-motion";

const messageRows = [
  { width: "w-44", align: "self-start", color: "bg-teal-300" },
  { width: "w-56", align: "self-end", color: "bg-amber-300" },
  { width: "w-36", align: "self-start", color: "bg-rose-300" },
  { width: "w-48", align: "self-end", color: "bg-cyan-300" },
];

export function AnimatedChatScene() {
  return (
    <div className="relative hidden min-h-[520px] lg:block" aria-hidden="true">
      <motion.div
        className="absolute inset-x-6 top-8 h-[460px] rounded-[8px] border border-white/15 bg-neutral-900/70 shadow-auth-pop backdrop-blur-xl [transform-style:preserve-3d]"
        initial={{ opacity: 0, rotateX: 58, rotateZ: -11, y: 30 }}
        animate={{
          opacity: 1,
          rotateX: [58, 52, 58],
          rotateZ: [-11, -7, -11],
          y: [0, -10, 0],
        }}
        transition={{
          opacity: { duration: 0.6 },
          rotateX: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          rotateZ: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ transformPerspective: 1100 }}
      >
        <div className="absolute inset-0 rounded-[8px] bg-[linear-gradient(135deg,rgba(20,184,166,0.18),transparent_35%,rgba(251,191,36,0.12)_65%,rgba(244,63,94,0.16))]" />
        <div className="relative flex h-full flex-col gap-5 p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <div className="h-3 w-28 rounded-[8px] bg-white/70" />
              <div className="mt-3 h-2 w-40 rounded-[8px] bg-white/25" />
            </div>
            <motion.div
              className="h-12 w-12 rounded-[8px] bg-teal-300 shadow-chat-glow"
              animate={{ rotateY: [0, 180, 360], rotateX: [0, 18, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="flex flex-1 flex-col justify-center gap-5">
            {messageRows.map((row, index) => (
              <motion.div
                key={row.width}
                className={`${row.align} ${row.width} rounded-[8px] ${row.color} p-4 shadow-lg`}
                initial={{ opacity: 0, x: index % 2 ? 40 : -40, z: 0 }}
                animate={{ opacity: 1, x: 0, z: [0, 34, 0] }}
                transition={{
                  delay: 0.2 + index * 0.14,
                  z: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                <div className="h-2 rounded-[8px] bg-neutral-950/55" />
                <div className="mt-3 h-2 w-2/3 rounded-[8px] bg-neutral-950/35" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
