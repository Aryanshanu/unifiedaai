-- Storage policies for the 'fractal' bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fractal' 
  AND (storage.foldername(name))[1] = 'data-quality'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fractal' 
  AND (storage.foldername(name))[1] = 'data-quality'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fractal' 
  AND (storage.foldername(name))[1] = 'data-quality'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'fractal' 
  AND (storage.foldername(name))[1] = 'data-quality'
  AND (storage.foldername(name))[2] = auth.uid()::text
);