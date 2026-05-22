import { Helmet } from 'react-helmet-async';

const SITE = 'https://aura-stream-henna.vercel.app';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article' | 'music.playlist' | 'music.musician' | 'profile';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function SEO({ title, description, path, image, type = 'website', jsonLd }: SEOProps) {
  const url = `${SITE}${path}`;
  const fullTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
  const desc = description.length > 160 ? description.slice(0, 157) + '...' : description;
  const ldArr = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
      {ldArr.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
