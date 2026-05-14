-- Zjin 情侣纪念记录网站 - 数据库初始化

-- 1. 情侣配对表
CREATE TABLE IF NOT EXISTS couples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  couple_name VARCHAR(100) NOT NULL DEFAULT '我们的小宇宙',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 用户资料表（扩展 Supabase Auth）
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 主题分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(10) NOT NULL DEFAULT '📌',
  color VARCHAR(20) NOT NULL DEFAULT '#F5E6E0',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 回忆记录表（核心）
CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood VARCHAR(20),
  location VARCHAR(200),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  bg_color VARCHAR(20),
  card_style VARCHAR(50),
  canvas_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  canvas_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  canvas_width DOUBLE PRECISION NOT NULL DEFAULT 300,
  canvas_height DOUBLE PRECISION NOT NULL DEFAULT 200,
  canvas_rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
  canvas_z INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 媒体文件表
CREATE TABLE IF NOT EXISTS memory_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  url TEXT NOT NULL,
  thumbnail TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 标签表
CREATE TABLE IF NOT EXISTS memory_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE NOT NULL,
  tag VARCHAR(50) NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_couple ON users(couple_id);
CREATE INDEX IF NOT EXISTS idx_categories_couple ON categories(couple_id);
CREATE INDEX IF NOT EXISTS idx_memories_couple ON memories(couple_id);
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date DESC);
CREATE INDEX IF NOT EXISTS idx_memory_media_memory ON memory_media(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_memory ON memory_tags(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON memory_tags(tag);

-- 启用 RLS
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_tags ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己 couple 的数据

-- couples: 通过 users 表关联
CREATE POLICY "Users can view own couple" ON couples
  FOR SELECT USING (
    id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own couple" ON couples
  FOR UPDATE USING (
    id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

-- 允许插入（注册时创建 couple）
CREATE POLICY "Users can insert couples" ON couples
  FOR INSERT WITH CHECK (true);

-- users: 可以查看自己和伴侣
CREATE POLICY "Users can view couple members" ON users
  FOR SELECT USING (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- categories: 只能访问自己 couple 的
CREATE POLICY "Couple members can view categories" ON categories
  FOR SELECT USING (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Couple members can insert categories" ON categories
  FOR INSERT WITH CHECK (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Couple members can update categories" ON categories
  FOR UPDATE USING (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Couple members can delete categories" ON categories
  FOR DELETE USING (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

-- memories: 只能访问自己 couple 的
CREATE POLICY "Couple members can view memories" ON memories
  FOR SELECT USING (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Couple members can insert memories" ON memories
  FOR INSERT WITH CHECK (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Couple members can update memories" ON memories
  FOR UPDATE USING (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Couple members can delete memories" ON memories
  FOR DELETE USING (
    couple_id IN (SELECT couple_id FROM users WHERE id = auth.uid())
  );

-- memory_media: 通过 memories 关联
CREATE POLICY "Couple members can view media" ON memory_media
  FOR SELECT USING (
    memory_id IN (
      SELECT id FROM memories WHERE couple_id IN (
        SELECT couple_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Couple members can insert media" ON memory_media
  FOR INSERT WITH CHECK (
    memory_id IN (
      SELECT id FROM memories WHERE couple_id IN (
        SELECT couple_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Couple members can delete media" ON memory_media
  FOR DELETE USING (
    memory_id IN (
      SELECT id FROM memories WHERE couple_id IN (
        SELECT couple_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- memory_tags: 通过 memories 关联
CREATE POLICY "Couple members can view tags" ON memory_tags
  FOR SELECT USING (
    memory_id IN (
      SELECT id FROM memories WHERE couple_id IN (
        SELECT couple_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Couple members can insert tags" ON memory_tags
  FOR INSERT WITH CHECK (
    memory_id IN (
      SELECT id FROM memories WHERE couple_id IN (
        SELECT couple_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Couple members can delete tags" ON memory_tags
  FOR DELETE USING (
    memory_id IN (
      SELECT id FROM memories WHERE couple_id IN (
        SELECT couple_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 启用 Realtime（实时推送）
ALTER PUBLICATION supabase_realtime ADD TABLE memories;
ALTER PUBLICATION supabase_realtime ADD TABLE memory_media;
ALTER PUBLICATION supabase_realtime ADD TABLE memory_tags;
