-- 画布涂鸦数据表
CREATE TABLE IF NOT EXISTS canvas_drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  path_data JSONB NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_canvas_drawings_couple ON canvas_drawings(couple_id);

-- RLS
ALTER TABLE canvas_drawings ENABLE ROW LEVEL SECURITY;

-- 情侣只能访问自己的涂鸦
CREATE POLICY "Users can view couple drawings"
  ON canvas_drawings FOR SELECT
  USING (
    couple_id IN (
      SELECT couple_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert couple drawings"
  ON canvas_drawings FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT couple_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete couple drawings"
  ON canvas_drawings FOR DELETE
  USING (
    couple_id IN (
      SELECT couple_id FROM users WHERE id = auth.uid()
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_drawings;
