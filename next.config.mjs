const nextConfig = {
  async headers() {
    return [
      {
        // Embed routes and the embed loader need to be frameable from any store.
        source: '/embed/:path*',
        headers: [
          // Allow any store to iframe these routes. CSP frame-ancestors
          // supersedes X-Frame-Options in modern browsers.
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
      {
        source: '/embed.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
