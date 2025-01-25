import { MetadataRoute } from 'next';

const BASE_URL = 'https://tuples.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urlList = [
    '/',  // Add more URLs as needed
  ];

  return urlList.map((url) => ({
    url: BASE_URL + url,
    lastModified: new Date().toISOString(),
  }));
}
