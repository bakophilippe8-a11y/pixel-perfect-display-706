-- Canal 'ai' : clé API Google (Gemini) du vendeur, chiffrée comme les autres accès.
ALTER TABLE public.seller_connections DROP CONSTRAINT seller_connections_channel_check;
ALTER TABLE public.seller_connections
  ADD CONSTRAINT seller_connections_channel_check CHECK (channel IN ('telegram','whatsapp','meta','ai'));

-- Plafonds quotidiens : réglages du vendeur (valeurs par défaut raisonnables).
ALTER TABLE public.sales_guidelines
  ADD COLUMN daily_ai_limit integer NOT NULL DEFAULT 300 CHECK (daily_ai_limit BETWEEN 1 AND 100000),
  ADD COLUMN daily_ads_limit integer NOT NULL DEFAULT 30 CHECK (daily_ads_limit BETWEEN 1 AND 10000),
  ADD COLUMN daily_video_limit integer NOT NULL DEFAULT 5 CHECK (daily_video_limit BETWEEN 1 AND 1000);
