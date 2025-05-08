/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SYNC_VERSION: process.env.SYNC_VERSION ?? '2'
  },
  // Removed srcDir - Next.js automatically detects the src directory
  // Removed experimental.appDir - The App Router is stable now
  async redirects() {
    return [
      { source: '/Artists', destination: '/artists', permanent: true },
      { source: '/Shows', destination: '/shows', permanent: true },
      { source: '/HowItWorks', destination: '/how-it-works', permanent: true },
    ];
  },
};

export default nextConfig; 