-- Create storage bucket for specialist avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('specialist-avatars', 'specialist-avatars', true);

-- Allow authenticated users to upload avatars (admins only via app logic)
CREATE POLICY "Admins can upload specialist avatars"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'specialist-avatars' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow public read access to avatars
CREATE POLICY "Anyone can view specialist avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'specialist-avatars');

-- Allow admins to update avatars
CREATE POLICY "Admins can update specialist avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'specialist-avatars' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete avatars
CREATE POLICY "Admins can delete specialist avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'specialist-avatars' 
  AND has_role(auth.uid(), 'admin'::app_role)
);