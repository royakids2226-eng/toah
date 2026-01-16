import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // تجاهل أخطاء ESLint أثناء البناء
  },
  typescript: {
    ignoreBuildErrors: true, // تجاهل أخطاء TypeScript أثناء البناء
  },
};

export default nextConfig;
