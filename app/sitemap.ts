import type { MetadataRoute } from 'next'

// Only public marketing pages belong in the search index.
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/grading', '/privacy'].map(path => ({
    url: new URL(path, 'https://www.sidelinepro.com.au').href,
  }))
}
