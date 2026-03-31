const Skeleton = ({ type = "text", count = 1, className = "" }) => {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === "card") {
    return (
      <div className={`skeleton-grid ${className}`}>
        {items.map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    );
  }

  if (type === "thread") {
    return items.map((i) => (
      <div key={i} className={`skeleton-thread ${className}`}>
        <div className="skeleton skeleton-avatar" />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text skeleton-text--short" />
          <div className="skeleton skeleton-text skeleton-text--medium" />
        </div>
      </div>
    ));
  }

  return items.map((i) => (
    <div key={i} className={`skeleton skeleton-text ${className}`} />
  ));
};

export default Skeleton;
