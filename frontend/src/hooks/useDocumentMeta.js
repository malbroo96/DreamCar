import { useEffect } from "react";

const SITE_NAME = "DreamCar";
const SITE_URL = "https://dreamcar-omega.vercel.app";
const DEFAULT_IMAGE = `${SITE_URL}/logo.svg`;

const ensureMetaTag = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== "content") element.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  element.setAttribute("content", attributes.content);
};

const ensureLinkTag = (selector, attributes) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
};

const useDocumentMeta = ({ title, description, path = "/" }) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const canonicalUrl = `${SITE_URL}${path}`;

    document.title = fullTitle;

    ensureMetaTag('meta[name="description"]', { name: "description", content: description });
    ensureMetaTag('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    ensureMetaTag('meta[property="og:description"]', { property: "og:description", content: description });
    ensureMetaTag('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    ensureMetaTag('meta[property="og:image"]', { property: "og:image", content: DEFAULT_IMAGE });
    ensureMetaTag('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    ensureMetaTag('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    ensureMetaTag('meta[name="twitter:image"]', { name: "twitter:image", content: DEFAULT_IMAGE });
    ensureLinkTag('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });
  }, [description, path, title]);
};

export default useDocumentMeta;
