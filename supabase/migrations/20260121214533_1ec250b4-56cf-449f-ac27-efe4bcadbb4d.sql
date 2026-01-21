-- Add video_url column to specialists table
ALTER TABLE public.specialists ADD COLUMN video_url text;

-- Create storage bucket for specialist videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('specialist-videos', 'specialist-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own videos
CREATE POLICY "Specialists can upload their own video"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'specialist-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own videos
CREATE POLICY "Specialists can update their own video"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'specialist-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Specialists can delete their own video"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'specialist-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to specialist videos
CREATE POLICY "Public can view specialist videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'specialist-videos');