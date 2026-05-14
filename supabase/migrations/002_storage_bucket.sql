-- 创建 Storage bucket 用于存储回忆图片
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memory-media',
  'memory-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage RLS 策略：已认证用户可上传
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'memory-media'
    AND auth.uid() IS NOT NULL
  );

-- Storage RLS 策略：所有人可查看（bucket 已设为 public）
CREATE POLICY "Anyone can view memory media" ON storage.objects
  FOR SELECT USING (bucket_id = 'memory-media');

-- Storage RLS 策略：已认证用户可删除
CREATE POLICY "Authenticated users can delete media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'memory-media'
    AND auth.uid() IS NOT NULL
  );
