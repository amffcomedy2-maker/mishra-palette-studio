// Browser-safe types and limits for the private visitor <-> admin chat.

export type ChatMessage = {
  id: string;
  sender: "visitor" | "admin";
  body: string;
  created_at: string;
};

export type ChatThread = {
  id: string;
  visitor_name: string;
  visitor_phone: string | null;
  last_preview: string;
  last_sender: "visitor" | "admin";
  admin_unread: number;
  created_at: string;
  last_message_at: string;
};

export const CHAT_LIMITS = {
  /** Longest single message, in characters. */
  messageLength: 1000,
  nameLength: 60,
  /** New conversations one device may start per hour. */
  newChatsPerHour: 5,
  /** Messages a visitor may send in one conversation per minute. */
  messagesPerMinute: 10,
  /** Most recent messages loaded per conversation. */
  historySize: 300,
} as const;

/** Trimmed message text, or null when it is empty or too long. */
export function cleanChatBody(input: string): string | null {
  const body = (input ?? "").replace(/\r\n/g, "\n").trim();
  return body && body.length <= CHAT_LIMITS.messageLength ? body : null;
}
