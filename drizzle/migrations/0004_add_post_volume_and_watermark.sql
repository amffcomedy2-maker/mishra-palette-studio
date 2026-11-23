ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS volume smallint NOT NULL DEFAULT 100;
ALTER TABLE public.posts ADD CONSTRAINT posts_volume_range CHECK (volume BETWEEN 0 AND 100);
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS watermark_text text NOT NULL DEFAULT 'painter.rf.gd';
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_watermark_len CHECK (char_length(watermark_text) BETWEEN 1 AND 60);