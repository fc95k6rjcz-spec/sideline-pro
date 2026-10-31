import { createAdminClient } from '@/lib/supabase/admin'

export const ANALYTICS_BUCKET = 'private-site-analytics'
export const publicPaths = ['/', '/grading', '/privacy']
export type Visit = { at: string; path: string; visitor: string; ip: string; country: string; city: string; source: string; device: string }

export async function analyticsStorage() {
  const storage = createAdminClient().storage
  const { data, error } = await storage.getBucket(ANALYTICS_BUCKET)
  if (error) {
    const created = await storage.createBucket(ANALYTICS_BUCKET, { public: false, fileSizeLimit: 4096, allowedMimeTypes: ['application/json'] })
    if (created.error) {
      const check = await storage.getBucket(ANALYTICS_BUCKET)
      if (check.error || check.data.public) throw new Error('Private analytics storage unavailable')
    }
  } else if (data.public) throw new Error('Analytics storage must be private')
  const bucket = storage.from(ANALYTICS_BUCKET)
  // Remove expired records in bounded batches on collection and dashboard access.
  const oldest = await bucket.list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  if (oldest.error) throw new Error('Analytics storage unavailable')
  const expired = (oldest.data ?? []).filter(f => Number(f.name.split('-')[0]) < Date.now() - 30 * 86400000).map(f => f.name)
  if (expired.length) { const removed = await bucket.remove(expired); if (removed.error) throw new Error('Analytics cleanup unavailable') }
  return bucket
}

export async function readVisits() {
  const bucket = await analyticsStorage()
  const { data, error } = await bucket.list('', { limit: 501, sortBy: { column: 'name', order: 'desc' } })
  if (error) throw new Error('Could not read analytics')
  const cutoff = Date.now() - 30 * 86400000
  const files = (data ?? []).filter(f => Number(f.name.split('-')[0]) >= cutoff).slice(0, 500)
  const visits: Visit[] = []
  // Bound download concurrency. The dashboard deliberately reports its sample limit.
  for (let i = 0; i < files.length; i += 20) {
    const batch = await Promise.all(files.slice(i, i + 20).map(async f => {
      const r = await bucket.download(f.name)
      if (r.error) throw new Error('Could not read an analytics record')
      return JSON.parse(await r.data.text()) as Visit
    }))
    visits.push(...batch)
  }
  return { visits, capped: (data?.length ?? 0) > 500 }
}
