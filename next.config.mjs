/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Removed for Hosted App approach
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
