// Web → API/socket are on different *.up.railway.app subdomains. Because
// up.railway.app sits on the Public Suffix List, those subdomains are
// separate registrable domains, so the auth cookie set by the API can't
// be read by the web's server-side auth gate. We rewrite /api/* and
// /socket.io/* through Next.js so the cookie lives on the web origin and
// reaches the API server-side via the proxy.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@team-hub/schemas'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/:path*` },
      { source: '/socket.io/:path*', destination: `${API_URL}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
