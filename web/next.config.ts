import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo: parent repo has package-lock.json; avoid wrong tracing root. */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '..'),
};

export default nextConfig;
