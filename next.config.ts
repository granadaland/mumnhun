import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/blog/:slug',
        destination: '/:slug',
        permanent: true,
      },
      {
        source: '/peta-situs',
        destination: '/sitemap',
        permanent: true,
      },
      {
        source: '/petunjuk',
        destination: '/petunjuk-pemakaian',
        permanent: true,
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/sitemap',
        destination: '/html-sitemap',
      },
    ]
  },

  images: {
    remotePatterns: [
      // WordPress media (legacy)
      {
        protocol: 'https',
        hostname: 'mumnhun.id',
        pathname: '/wp-content/**',
      },
      // Cloudinary CDN
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      // Unsplash (testimonial images)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  // Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
