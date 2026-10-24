ALTER TABLE public.sales_campaigns
  ADD COLUMN video_status text NOT NULL DEFAULT 'none' CHECK (video_status IN ('none','generating','ready','failed')),
  ADD COLUMN video_job_id text,
  ADD COLUMN video_model text,
  ADD COLUMN video_path text,
  ADD COLUMN video_error text,
  ADD COLUMN video_started_at timestamptz;
CREATE INDEX sales_campaigns_video_generating_idx ON public.sales_campaigns(user_id) WHERE video_status = 'generating';
-- Bucket privé : aucun accès client, lecture uniquement par liens signés générés côté serveur.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('campaign-videos', 'campaign-videos', false, 104857600, ARRAY['video/mp4'])
ON CONFLICT (id) DO NOTHING;
