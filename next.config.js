/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/dictation": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};
module.exports = nextConfig;
