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
};

export default nextConfig;
