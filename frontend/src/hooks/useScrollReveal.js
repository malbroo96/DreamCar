import { useEffect } from "react";

const REVEAL_SELECTOR = [
  ".content-area section",
  ".content-area .section-header",
  ".content-area .card",
  ".content-area .messages-layout",
  ".content-area .profile-hero-card",
  ".content-area .profile-edit-card",
  ".content-area .profile-section",
  ".content-area .profile-tabs",
].join(", ");

const useScrollReveal = (routeKey) => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = Array.from(document.querySelectorAll(REVEAL_SELECTOR));

    if (!nodes.length) return undefined;

    nodes.forEach((node, index) => {
      node.classList.add("reveal-on-scroll");
      node.style.setProperty("--reveal-delay", `${Math.min(index, 6) * 50}ms`);
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [routeKey]);
};

export default useScrollReveal;
