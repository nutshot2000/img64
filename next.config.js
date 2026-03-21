/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export for API routes to work
  // output: 'export',
  // distDir: 'dist',
  images: {
    unoptimized: true
  },
}

module.exports = nextConfig