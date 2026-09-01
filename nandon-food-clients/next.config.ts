import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Admin-uploaded images come from Cloudinary (prod) or the API's
    // /uploads static folder (local dev). Allow both.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "5000", pathname: "/uploads/**" },
      { protocol: "https", hostname: "**.nandonfood.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
