const PROJECT_REF = 'jzypcsqhjjpdcjslzgbd'
const MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN

if (!MANAGEMENT_TOKEN) {
  console.error('Error: SUPABASE_MANAGEMENT_TOKEN environment variable is required')
  console.error('Run: export SUPABASE_MANAGEMENT_TOKEN=your_token')
  process.exit(1)
}

async function runSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MANAGEMENT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }

  return res.json()
}

async function main() {
  console.log('Setting up Storage bucket...')

  // 1. 创建 bucket
  console.log('Creating storage bucket...')
  try {
    await runSQL(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'memory-media',
        'memory-media',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      )
      ON CONFLICT (id) DO NOTHING;
    `)
    console.log('✓ Bucket created')
  } catch (e) {
    console.log('Bucket may already exist:', e.message)
  }

  // 2. 创建 RLS 策略
  console.log('Creating storage RLS policies...')

  // 先删除已有策略（如果存在）
  const dropNames = [
    'Authenticated users can upload media',
    'Anyone can view memory media',
    'Authenticated users can delete media',
  ]
  for (const name of dropNames) {
    try {
      await runSQL(`DROP POLICY IF EXISTS "${name}" ON storage.objects;`)
    } catch (_) {}
  }

  const policies = [
    {
      name: 'Authenticated users can upload media',
      sql: `CREATE POLICY "Authenticated users can upload media"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'memory-media' AND auth.uid() IS NOT NULL);`
    },
    {
      name: 'Anyone can view memory media',
      sql: `CREATE POLICY "Anyone can view memory media"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'memory-media');`
    },
    {
      name: 'Authenticated users can delete media',
      sql: `CREATE POLICY "Authenticated users can delete media"
            ON storage.objects FOR DELETE
            USING (bucket_id = 'memory-media' AND auth.uid() IS NOT NULL);`
    }
  ]

  for (const policy of policies) {
    try {
      await runSQL(policy.sql)
      console.log(`✓ Policy "${policy.name}" created`)
    } catch (e) {
      console.log(`Policy "${policy.name}" may already exist:`, e.message)
    }
  }

  // 3. 授权
  console.log('Granting permissions...')
  try {
    await runSQL(`
      GRANT ALL ON storage.objects TO authenticated;
      GRANT SELECT ON storage.objects TO anon;
    `)
    console.log('✓ Permissions granted')
  } catch (e) {
    console.log('Permissions may already be set:', e.message)
  }

  console.log('\nDone! Storage bucket is ready.')
}

main().catch(console.error)
