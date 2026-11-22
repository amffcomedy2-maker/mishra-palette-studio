DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
REVOKE SELECT ON public.site_settings FROM anon, authenticated;