/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Bỏ qua lỗi ESLint khi build trên Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Bỏ qua lỗi TypeScript khi build trên Vercel
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Cho phép Next.js phục vụ ảnh qua route proxy nội bộ
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Cho phép unoptimized img tag (dùng <img> trực tiếp thay vì <Image>)
    unoptimized: true,
  },
};

export default nextConfig;
