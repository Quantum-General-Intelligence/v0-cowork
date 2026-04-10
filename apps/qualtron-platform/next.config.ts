import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@qgst/client', '@qgst/ui'],
}

export default nextConfig

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
initOpenNextCloudflareForDev()
