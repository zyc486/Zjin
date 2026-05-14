import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN
const PROJECT = 'jzypcsqhjjpdcjslzgbd'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TOKEN) {
  console.error('Error: Required environment variables missing')
  console.error('Set: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_MANAGEMENT_TOKEN')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const USER1_EMAIL = 'user1@zjin.app'
const USER2_EMAIL = 'user2@zjin.app'
const PASSWORD = 'zjin2026'

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const data = await res.json()
  if (data.message && !res.ok) throw new Error(data.message)
  return data
}

async function main() {
  // 1. 登录获取用户 ID
  console.log('Logging in as user1...')
  await supabase.auth.signInWithPassword({ email: USER1_EMAIL, password: PASSWORD })
  const { data: { session: s1 } } = await supabase.auth.getSession()
  const user1Id = s1.user.id
  console.log('User1 ID:', user1Id)

  await supabase.auth.signOut()
  await supabase.auth.signInWithPassword({ email: USER2_EMAIL, password: PASSWORD })
  const { data: { session: s2 } } = await supabase.auth.getSession()
  const user2Id = s2.user.id
  console.log('User2 ID:', user2Id)
  await supabase.auth.signOut()

  // 2. 临时禁用 RLS 来插入数据
  console.log('Temporarily disabling RLS...')
  await query('ALTER TABLE couples DISABLE ROW LEVEL SECURITY')
  await query('ALTER TABLE users DISABLE ROW LEVEL SECURITY')
  await query('ALTER TABLE categories DISABLE ROW LEVEL SECURITY')

  // 3. 创建情侣空间
  console.log('Creating couple...')
  await query(`INSERT INTO couples (id, invite_code, couple_name) VALUES (gen_random_uuid(), 'LOVE0001', '我们的小宇宙') ON CONFLICT DO NOTHING`)
  const coupleRes = await query(`SELECT id FROM couples LIMIT 1`)
  const coupleId = coupleRes[0]?.id
  console.log('Couple ID:', coupleId)

  if (!coupleId) {
    console.error('Failed to create couple')
    return
  }

  // 4. 创建用户资料
  console.log('Creating user profiles...')
  await query(`INSERT INTO users (id, nickname, couple_id) VALUES ('${user1Id}', 'A', '${coupleId}') ON CONFLICT (id) DO UPDATE SET nickname = 'A', couple_id = '${coupleId}'`)
  await query(`INSERT INTO users (id, nickname, couple_id) VALUES ('${user2Id}', 'B', '${coupleId}') ON CONFLICT (id) DO UPDATE SET nickname = 'B', couple_id = '${coupleId}'`)

  // 5. 创建默认分类
  console.log('Creating categories...')
  const cats = [
    ['日常', '☀️', '#F5E6E0', 0],
    ['吃饭', '🍜', '#FFE4C4', 1],
    ['旅行', '✈️', '#E0F0E0', 2],
    ['电影', '🎬', '#E8D0F0', 3],
    ['娱乐', '🎮', '#D0E8F0', 4],
    ['节日', '🎉', '#FFE0E0', 5],
    ['纪念日', '💕', '#FFD0D0', 6],
    ['自拍', '📸', '#F0E0D0', 7],
    ['深夜聊天', '🌙', '#E0E0F0', 8],
    ['游戏', '🎯', '#D0F0E0', 9],
  ]
  for (const [name, icon, color, sort] of cats) {
    await query(`INSERT INTO categories (couple_id, name, icon, color, sort_order) VALUES ('${coupleId}', '${name}', '${icon}', '${color}', ${sort})`)
  }

  // 6. 重新启用 RLS
  console.log('Re-enabling RLS...')
  await query('ALTER TABLE couples ENABLE ROW LEVEL SECURITY')
  await query('ALTER TABLE users ENABLE ROW LEVEL SECURITY')
  await query('ALTER TABLE categories ENABLE ROW LEVEL SECURITY')

  console.log('\n=== Done! ===')
  console.log(`Couple: ${coupleId}`)
  console.log(`User1: ${user1Id} (A)`)
  console.log(`User2: ${user2Id} (B)`)
  console.log(`\nLogin: ${USER1_EMAIL} / ${PASSWORD} or ${USER2_EMAIL} / ${PASSWORD}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
