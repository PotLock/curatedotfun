export const HexagonAvatar = () => {
  return (
    <div className="relative w-10 h-10 -mt-2">
      <div className="absolute inset-0">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <defs>
            <linearGradient
              id="hexGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" style={{ stopColor: "#ff8f3e" }} />
              <stop offset="100%" style={{ stopColor: "#ff6b00" }} />
            </linearGradient>
            <clipPath id="hexagonClip">
              <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" />
            </clipPath>
          </defs>
          <path
            d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            className="scale-[1.01] origin-center"
          />
          <image
            href="https://i.pinimg.com/736x/66/3d/2a/663d2a5aea2fe70f6aefc96464cb1e2a.jpg"
            width="24"
            height="24"
            clipPath="url(#hexagonClip)"
            className="object-cover"
          />
          <path
            d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z"
            fill="none"
            stroke="white"
            strokeWidth="0.2"
            strokeOpacity="0.5"
            className="scale-[0.95] origin-center"
          />
        </svg>
      </div>
    </div>
  );
};
