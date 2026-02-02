const WORDPRESS_API_URL = 'https://mumnhun.id/wp-json/wp/v2'

export interface Post {
  id: number
  date: string
  modified: string
  slug: string
  title: {
    rendered: string
  }
  content: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  featured_media: number
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
      media_details?: {
        sizes?: {
          large?: {
            source_url: string
          }
          medium_large?: {
            source_url: string
          }
        }
      }
    }>
  }
}

export async function getPosts(page = 1, perPage = 10): Promise<Post[]> {
  try {
    const res = await fetch(
      `${WORDPRESS_API_URL}/posts?page=${page}&per_page=${perPage}&_embed`,
      { 
        next: { revalidate: 3600 },
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!res.ok) {
      if (res.status === 400) {
        return []
      }
      throw new Error(`Failed to fetch posts: ${res.status}`)
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching posts:', error)
    return []
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(
      `${WORDPRESS_API_URL}/posts?slug=${slug}&_embed`,
      { 
        next: { revalidate: 3600 },
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!res.ok) {
      throw new Error(`Failed to fetch post: ${res.status}`)
    }

    const posts = await res.json()
    return posts[0] || null
  } catch (error) {
    console.error('Error fetching post:', error)
    return null
  }
}

export function getFeaturedImageUrl(post: Post): string {
  if (post._embedded?.['wp:featuredmedia']?.[0]) {
    const media = post._embedded['wp:featuredmedia'][0]
    
    return media.media_details?.sizes?.large?.source_url ||
           media.media_details?.sizes?.medium_large?.source_url ||
           media.source_url ||
           '/placeholder-blog.jpg'
  }
  
  return '/placeholder-blog.jpg'
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

// Clean WordPress content - Remove custom classes and fix structure
export function cleanWordPressContent(html: string): string {
  let cleaned = html;
  
  // 1. Remove images (we handle featured image separately)
  cleaned = cleaned
    .replace(/<figure[^>]*class="[^"]*wp-caption[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/<img[^>]*>/gi, '');
  
  // 2. Remove ALL inline classes from tags (keep structure, remove styling)
  cleaned = cleaned.replace(/(<[^>]+)\s+class="[^"]*"([^>]*>)/gi, '$1$2');
  cleaned = cleaned.replace(/(<[^>]+)\s+style="[^"]*"([^>]*>)/gi, '$1$2');
  
  // 3. Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
  
  // 4. Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
