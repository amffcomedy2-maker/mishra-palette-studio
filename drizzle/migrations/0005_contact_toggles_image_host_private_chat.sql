ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS show_call boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_whatsapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS image_host text NOT NULL DEFAULT 'imgbb';
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_image_host_check CHECK (image_host IN ('imgbb', 'cloudinary'));

CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name text NOT NULL CHECK (char_length(visitor_name) BETWEEN 1 AND 60),
  visitor_phone text CHECK (visitor_phone IS NULL OR char_length(visitor_phone) <= 20),
  secret_hash text NOT NULL,
  ip_hash text,
  last_preview text NOT NULL DEFAULT '',
  last_sender text NOT NULL DEFAULT 'visitor',
  admin_unread integer NOT NULL DEFAULT 0,
  visitor_unread integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('visitor', 'admin')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX chat_messages_thread_idx ON public.chat_messages (thread_id, created_at);
CREATE INDEX chat_threads_recent_idx ON public.chat_threads (last_message_at DESC);
CREATE INDEX chat_threads_ip_idx ON public.chat_threads (ip_hash, created_at);

CREATE OR REPLACE FUNCTION public.chat_message_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.chat_threads
     SET last_message_at = NEW.created_at,
         last_preview = left(NEW.body, 120),
         last_sender = NEW.sender,
         admin_unread = CASE WHEN NEW.sender = 'visitor' THEN admin_unread + 1 ELSE admin_unread END,
         visitor_unread = CASE WHEN NEW.sender = 'admin' THEN visitor_unread + 1 ELSE visitor_unread END
   WHERE id = NEW.thread_id;
  -- Data-free doorbells: the browser re-fetches through the server, which checks who is asking.
  BEGIN
    PERFORM realtime.send('{}'::jsonb, 'changed', 'chat-' || NEW.thread_id::text, false);
    PERFORM realtime.send('{}'::jsonb, 'changed', 'chat-admin', false);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.chat_message_added() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER chat_messages_added AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_message_added();