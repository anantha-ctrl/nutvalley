import { Helmet } from 'react-helmet-async';
import { useStore } from '../context/StoreContext';

const DEFAULT_DESC = 'Premium nuts & dry fruits, packed fresh. Shop almonds, cashews, pistachios, walnuts, dates, seeds and more.';

/**
 * Per-page SEO: title, description, and Open Graph / Twitter tags.
 * The site/brand name is the live, admin-editable store name.
 */
export default function Seo({ title, description = DEFAULT_DESC, image, type = 'website' }) {
  const { name: SITE } = useStore();
  const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — Premium Nuts & Dry Fruits`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={SITE} />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
