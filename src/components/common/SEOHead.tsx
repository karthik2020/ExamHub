import React, { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogType?: string;
  jsonLd?: Record<string, any>;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'dMATHub — Master the Doctoral Management Aptitude Test',
  description = 'Dedicated preparation platform for the dMAT. Practice with 4x4 figure sequences, mathematical logic, procedural generation, and timed exam simulations.',
  canonical,
  ogType = 'website',
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Page Title
    document.title = title;

    // Helper to set or create meta tag
    const setMetaTag = (attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Standard & OpenGraph Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'dMATHub');

    // 3. Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    // 4. Canonical URL
    const resolvedCanonical = canonical || (typeof window !== 'undefined' ? window.location.href : 'https://dmathub.com');
    setMetaTag('property', 'og:url', resolvedCanonical);

    let linkCanonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', resolvedCanonical);

    // 5. Schema.org JSON-LD
    let scriptJsonLd = document.getElementById('schema-jsonld') as HTMLScriptElement;
    const defaultJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: 'dMATHub',
      url: 'https://dmathub.com',
      description: 'Specialized online examination preparation platform for the Doctoral Management Aptitude Test (dMAT).',
      slogan: 'Learn. Practise. Track. Master.',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'EUR',
        lowPrice: '0',
        highPrice: '29',
      },
    };

    const payload = jsonLd || defaultJsonLd;
    if (!scriptJsonLd) {
      scriptJsonLd = document.createElement('script');
      scriptJsonLd.id = 'schema-jsonld';
      scriptJsonLd.type = 'application/ld+json';
      document.head.appendChild(scriptJsonLd);
    }
    scriptJsonLd.textContent = JSON.stringify(payload);
  }, [title, description, canonical, ogType, jsonLd]);

  return null;
};
