/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] }
  },
  serverExternalPackages: ['pg', '@prisma/adapter-pg', '@prisma/client', 'bcryptjs'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }]
  }
}

export default nextConfig
