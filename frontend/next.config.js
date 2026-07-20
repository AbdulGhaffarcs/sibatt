/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  webpack: (config) => {
    // sql.js references 'fs' at module level — tell webpack to ignore it in browser
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    return config
  },
}

module.exports = nextConfig
