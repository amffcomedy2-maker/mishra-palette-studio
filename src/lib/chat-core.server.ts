// Server-only helpers for the private visitor <-> admin chat.
// Only import this file dynamically from inside server function handlers.
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sha256Hex, UserError } from "@/lib/admin-core.server";
import { CHAT_LIMITS, type ChatMessage } from "@/lib/chat";

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function ipHash(): Promise<string> {
  const ip =
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-real-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return sha256Hex(`chat-ip:${process.env["ADMIN_SESSION_SECRET"] ?? ""}:${ip}`);
}

async function chatEnabled(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("chat_enabled")
    .eq("id", 1)
    .maybeSingle();
  return data?.chat_enabled !== false;
}

export async function listMessages(threadId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("id, sender, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(CHAT_LIMITS.historySize);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** The visitor's own thread, or null when the key is wrong or the admin deleted the chat. */
async function visitorThread(threadId: string, secret: string) {
  const { data } = await supabaseAdmin
    .from("chat_threads")
    .select("id, secret_hash, visitor_unread")
    .eq("id", threadId)
    .maybeSingle();
  if (!data) return null;
  const given = await sha256Hex(`chat-key:${secret}`);
  if (given.length !== data.secret_hash.length) return null;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ data.secret_hash.charCodeAt(i);
  return diff === 0 ? data : null;
}

export async function startChat(input: { name: string; phone?: string | undefined; body: string }) {
  if (!(await chatEnabled())) throw new UserError("Chat is turned off right now.");
  const ip = await ipHash();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("chat_threads")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ip)
    .gte("created_at", since);
  if ((count ?? 0) >= CHAT_LIMITS.newChatsPerHour)
    throw new UserError("Too many new chats from this device. Please try again later.");
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const { data: thread, error } = await supabaseAdmin
    .from("chat_threads")
    .insert({
      visitor_name: input.name,
      visitor_phone: input.phone || null,
      secret_hash: await sha256Hex(`chat-key:${secret}`),
      ip_hash: ip,
    })
    .select("id")
    .single();
  if (error || !thread) throw new Error(error?.message ?? "thread insert failed");
  const { error: mErr } = await supabaseAdmin
    .from("chat_messages")
    .insert({ thread_id: thread.id, sender: "visitor", body: input.body });
  if (mErr) throw new Error(mErr.message);
  return { threadId: thread.id, secret, messages: await listMessages(thread.id) };
}

export async function visitorSend(threadId: string, secret: string, body: string) {
  const thread = await visitorThread(threadId, secret);
  if (!thread) return { gone: true as const, messages: [] as ChatMessage[] };
  if (!(await chatEnabled())) throw new UserError("Chat is turned off right now.");
  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId)
    .eq("sender", "visitor")
    .gte("created_at", since);
  if ((count ?? 0) >= CHAT_LIMITS.messagesPerMinute)
    throw new UserError("You are sending messages too fast. Please wait a moment.");
  const { error } = await supabaseAdmin
    .from("chat_messages")
    .insert({ thread_id: threadId, sender: "visitor", body });
  if (error) throw new Error(error.message);
  return { gone: false as const, messages: await listMessages(threadId) };
}

export async function visitorFetch(threadId: string, secret: string, markRead: boolean) {
  const thread = await visitorThread(threadId, secret);
  if (!thread) return { gone: true as const, messages: [] as ChatMessage[], unread: 0 };
  if (markRead && thread.visitor_unread > 0)
    await supabaseAdmin.from("chat_threads").update({ visitor_unread: 0 }).eq("id", threadId);
  return {
    gone: false as const,
    messages: await listMessages(threadId),
    unread: markRead ? 0 : thread.visitor_unread,
  };
}
