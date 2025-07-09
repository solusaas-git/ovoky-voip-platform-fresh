/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15 configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        port: '',
        pathname: '/w40/**',
      },
    ],
  },
};

export default nextConfig; // Force rebuild
