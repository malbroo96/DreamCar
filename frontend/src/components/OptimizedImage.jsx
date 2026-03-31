import { memo, useState } from "react";

const CLOUDINARY_WIDTHS = [400, 800, 1200];

const buildCloudinarySrcSet = (url) => {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return null;
  return CLOUDINARY_WIDTHS.map(
    (w) => `${parts[0]}/upload/w_${w},c_limit,q_auto,f_auto/${parts[1]} ${w}w`
  ).join(", ");
};

const buildCloudinaryThumb = (url, width = 400) => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;
  return `${parts[0]}/upload/w_${width},c_limit,q_auto,f_auto/${parts[1]}`;
};

const OptimizedImage = memo(({ src, alt, className = "", width, height, sizes = "(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw", onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const srcSet = buildCloudinarySrcSet(src);
  const thumb = buildCloudinaryThumb(src, 400);

  if (error || !src) {
    return (
      <div className={`img-placeholder ${className}`} style={{ width, height }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
    );
  }

  return (
    <img
      src={thumb || src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt || ""}
      className={`${className} ${loaded ? "img-loaded" : "img-loading"}`}
      loading="lazy"
      decoding="async"
      width={width}
      height={height}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      onClick={onClick}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
