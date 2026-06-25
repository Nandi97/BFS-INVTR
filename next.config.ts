import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	serverExternalPackages: ['xlsx', 'exceljs', '@react-pdf/renderer'],
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'avatars.githubusercontent.com' },
			{ protocol: 'https', hostname: 'lh3.googleusercontent.com' },
			{ protocol: 'https', hostname: 'utfs.io' },
		],
	},
};

export default nextConfig;
