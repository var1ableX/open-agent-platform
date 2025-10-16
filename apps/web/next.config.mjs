/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the top-level `serverActions` key in Next.js 14 and later
  serverActions: {
    bodySizeLimit: '100mb',
  },
};

export default nextConfig;
