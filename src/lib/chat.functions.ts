import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CHAT_LIMITS, type ChatMessage } from "@/lib/chat";

// Public (no login) chat endpoints. A visitor proves ownership of a conversation with the
// random key issued when it was started; the server never returns anyone else's messages.

const body = z.string().trim().min(1).max(CHAT_LIMITS.messageLength);
const key = z.object({ threadId: z.string().uuid(), secret: z.string().min(20).max(100) });

type Fail = { ok: false; error: string; gone?: boolean };

async function run<T>(fn: () => Promise<T>): Promise<({ ok: true } & T) | Fail> {
  const { UserError } = await import("@/lib/admin-core.server");
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error("chat failed", e);
    return { ok: false, error: "Message could not be sent. Please try again." };
  }
}

export const chatStart = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(CHAT_LIMITS.nameLength),
        phone: z
          .string()
          .trim()
          .regex(/^[+\d\s-]{7,16}$/)
          .optional(),
        body,
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const c = await import("@/lib/chat-core.server");
    return run(() => c.startChat(data));
  });

export const chatSend = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => key.extend({ body }).parse(i))
  .handler(async ({ data }) => {
    const c = await import("@/lib/chat-core.server");
    return run(() => c.visitorSend(data.threadId, data.secret, data.body));
  });

export const chatFetch = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => key.extend({ markRead: z.boolean() }).parse(i))
  .handler(async ({ data }) => {
    const c = await import("@/lib/chat-core.server");
    return run(() => c.visitorFetch(data.threadId, data.secret, data.markRead));
  });

export type { ChatMessage };
