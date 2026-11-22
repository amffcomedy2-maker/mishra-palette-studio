CREATE TABLE public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  devotional_header text NOT NULL DEFAULT 'जय श्री श्याम',
  business_name text NOT NULL DEFAULT 'Mishra Painters',
  proprietor_name text NOT NULL DEFAULT 'Amit Mishra',
  experience_text text NOT NULL DEFAULT '20+ Years of Experience',
  services_text text NOT NULL DEFAULT 'मकान में सुंदर एवं आकर्षक पेंटिंग, वॉल पुट्टी, प्लास्टिक पेंट, रॉयल प्ले, वॉल टेक्सचर एवं फर्नीचर पॉलिश इत्यादि... के लिए संपर्क करें।',
  call_number text NOT NULL DEFAULT '9217672275',
  whatsapp_number text NOT NULL DEFAULT '7488650236',
  address text NOT NULL DEFAULT 'Sector 105, Gurgaon',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.site_settings (id) VALUES (1);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('photo','facebook','video')),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Painting',
  note text,
  image_url text,
  embed_url text,
  source_url text,
  video_url text,
  orientation text NOT NULL DEFAULT 'vertical' CHECK (orientation IN ('vertical','horizontal','square')),
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read visible posts" ON public.posts FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE INDEX posts_created_idx ON public.posts (created_at DESC);

CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  service text NOT NULL CHECK (service IN ('imgbb','cloudinary','gemini','custom')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  last_test_ok boolean,
  last_test_message text,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.api_integrations TO service_role;
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_auth (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pin_hash text,
  pin_salt text,
  session_version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_auth TO service_role;
ALTER TABLE public.admin_auth ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_auth (id) VALUES (1);

CREATE TABLE public.login_attempts (
  key text PRIMARY KEY,
  attempts int NOT NULL DEFAULT 0,
  first_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.translation_cache (
  key text PRIMARY KEY,
  lang text NOT NULL,
  source text NOT NULL,
  translated text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.translation_cache TO service_role;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.content_version (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_version TO anon, authenticated;
GRANT ALL ON public.content_version TO service_role;
ALTER TABLE public.content_version ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read content version" ON public.content_version FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.content_version (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.bump_content_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content_version SET version = version + 1, updated_at = now() WHERE id = 1;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_content_version() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER posts_bump_version AFTER INSERT OR UPDATE OR DELETE ON public.posts
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_content_version();
CREATE TRIGGER settings_bump_version AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_content_version();

ALTER PUBLICATION supabase_realtime ADD TABLE public.content_version;