/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/dictation": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  serverExternalPackages: ["ffmpeg-static"],
};
module.exports = nextConfig;
