import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Monaco editor ships large assets; disable minification for its chunks in dev
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Monaco web workers use require() — keep them as separate chunks
      config.resolve = config.resolve ?? {}
      config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    }
    return config
  },
}

export default nextConfig
