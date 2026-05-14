const TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN
const PROJECT = 'jzypcsqhjjpdcjslzgbd'

if (!TOKEN) {
  console.error('Error: SUPABASE_MANAGEMENT_TOKEN environment variable is required')
  console.error('Run: export SUPABASE_MANAGEMENT_TOKEN=your_token')
  process.exit(1)
}

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
  if (data.message && !res.ok) {
    console.error('Error:', data.message.substring(0, 150))
    return false
  }
  return true
}

async function main() {
  // 授予权限给 authenticated 角色（登录用户）
  const tables = ['couples', 'users', 'categories', 'memories', 'memory_media', 'memory_tags']

  for (const table of tables) {
    const ok = await query(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.${table} TO authenticated`)
    console.log(`GRANT ${table} to authenticated: ${ok ? 'OK' : 'FAILED'}`)
  }

  // 也给 anon 角色授予 SELECT（用于登录前检查）
  for (const table of tables) {
    const ok = await query(`GRANT SELECT ON public.${table} TO anon`)
    console.log(`GRANT SELECT ${table} to anon: ${ok ? 'OK' : 'FAILED'}`)
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
