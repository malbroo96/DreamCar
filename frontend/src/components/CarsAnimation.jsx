 
import "./CarsAnimation.css";

/* ── Car SVG shapes (side-view silhouettes) ── */
const CAR_SVGS = [
  /* Sedan */
  `<svg viewBox="0 0 120 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="28" width="100" height="14" rx="4"/>
    <path d="M25 28 C28 16 38 12 55 12 L75 12 C90 12 98 16 100 28Z"/>
    <circle cx="30" cy="44" r="8" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="90" cy="44" r="8" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="30" cy="44" r="3" fill="currentColor"/>
    <circle cx="90" cy="44" r="3" fill="currentColor"/>
    <rect x="95" y="30" width="8" height="5" rx="1" fill="#fffde7" opacity="0.9"/>
    <rect x="5" y="30" width="6" height="4" rx="1" fill="#ff6b6b" opacity="0.8"/>
  </svg>`,

  /* SUV */
  `<svg viewBox="0 0 130 55" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="26" width="114" height="18" rx="4"/>
    <path d="M20 26 C22 10 32 8 50 8 L85 8 C102 8 108 12 110 26Z"/>
    <circle cx="32" cy="46" r="9" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="98" cy="46" r="9" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="32" cy="46" r="3.5" fill="currentColor"/>
    <circle cx="98" cy="46" r="3.5" fill="currentColor"/>
    <rect x="104" y="28" width="10" height="6" rx="1" fill="#fffde7" opacity="0.9"/>
    <rect x="4" y="29" width="7" height="4" rx="1" fill="#ff6b6b" opacity="0.8"/>
  </svg>`,

  /* Sports car */
  `<svg viewBox="0 0 130 45" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="28" width="120" height="10" rx="3"/>
    <path d="M18 28 C22 18 35 13 55 13 L80 13 C100 13 110 18 115 28Z"/>
    <circle cx="28" cy="40" r="7" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="100" cy="40" r="7" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="28" cy="40" r="2.5" fill="currentColor"/>
    <circle cx="100" cy="40" r="2.5" fill="currentColor"/>
    <rect x="110" y="28" width="10" height="5" rx="1" fill="#fffde7" opacity="0.9"/>
    <rect x="3" y="29" width="6" height="3" rx="1" fill="#ff6b6b" opacity="0.8"/>
  </svg>`,

  /* Hatchback */
  `<svg viewBox="0 0 110 50" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="28" width="94" height="13" rx="4"/>
    <path d="M22 28 C24 16 34 13 50 13 L72 13 C86 13 92 18 94 28Z"/>
    <circle cx="28" cy="43" r="8" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="84" cy="43" r="8" fill="#1a1a2e" stroke="currentColor" stroke-width="2"/>
    <circle cx="28" cy="43" r="3" fill="currentColor"/>
    <circle cx="84" cy="43" r="3" fill="currentColor"/>
    <rect x="88" y="29" width="8" height="5" rx="1" fill="#fffde7" opacity="0.9"/>
    <rect x="4" y="29" width="6" height="4" rx="1" fill="#ff6b6b" opacity="0.8"/>
  </svg>`,
];

/* ── Car config ── */
const CARS = [
  { svg: 0, lane: 12,  duration: 18, delay: 0,    size: 80,  opacity: 0.12, direction: 1  },
  { svg: 1, lane: 22,  duration: 24, delay: 4,    size: 95,  opacity: 0.08, direction: 1  },
  { svg: 2, lane: 78,  duration: 20, delay: 8,    size: 85,  opacity: 0.10, direction: -1 },
  { svg: 3, lane: 88,  duration: 15, delay: 2,    size: 70,  opacity: 0.09, direction: -1 },
  { svg: 0, lane: 50,  duration: 30, delay: 12,   size: 90,  opacity: 0.06, direction: 1  },
  { svg: 2, lane: 65,  duration: 22, delay: 6,    size: 75,  opacity: 0.07, direction: -1 },
  { svg: 1, lane: 35,  duration: 28, delay: 16,   size: 100, opacity: 0.05, direction: 1  },
  { svg: 3, lane: 95,  duration: 17, delay: 10,   size: 65,  opacity: 0.08, direction: -1 },
];

const CarsAnimation = () => {
  return (
    <div className="cars-animation-layer" aria-hidden="true">
      {CARS.map((car, i) => (
        <div
          key={i}
          className={`car-track car-track--${car.direction === 1 ? "ltr" : "rtl"}`}
          style={{
            top: `${car.lane}%`,
            animationDuration: `${car.duration}s`,
            animationDelay: `${car.delay}s`,
            opacity: car.opacity,
            width: car.size,
            color: "var(--car-color, #0b6ef3)",
          }}
          dangerouslySetInnerHTML={{ __html: CAR_SVGS[car.svg] }}
        />
      ))}
    </div>
  );
};

export default CarsAnimation;