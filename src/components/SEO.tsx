import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    url?: string;
}

export const SEO = ({ title, description, image, url }: SEOProps) => {
    const siteTitle = "FutoraOne";
    const fullTitle = `${title} | ${siteTitle}`;
    const defaultDescription = "FutoraOne - Your ultimate developer community and innovation hub.";
    const metaDescription = description || defaultDescription;
    const metaImage = image || "/og-image.png"; // Assuming a default OG image exists or will exist

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={metaDescription} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            {image && <meta property="og:image" content={metaImage} />}
            {url && <meta property="og:url" content={url} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDescription} />
            {image && <meta name="twitter:image" content={metaImage} />}
        </Helmet>
    );
};
