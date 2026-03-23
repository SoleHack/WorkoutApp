/** @type {import('next').NextConfig} */
const nextConfig = {
  // CSS modules work natively in Next.js
  experimental: {
    optimizePackageImports: ['recharts'],
  },
}

export default nextConfig
