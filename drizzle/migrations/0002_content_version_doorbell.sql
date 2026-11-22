CREATE OR REPLACE FUNCTION public.bump_content_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content_version SET version = version + 1, updated_at = now() WHERE id = 1;
  -- Data-free doorbell on a public broadcast topic; visitors re-fetch via the server.
  PERFORM realtime.send('{}'::jsonb, 'changed', 'site-content', false);
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_content_version() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read content version" ON public.content_version;
REVOKE SELECT ON public.content_version FROM anon, authenticated;
ALTER PUBLICATION supabase_realtime DROP TABLE public.content_version;