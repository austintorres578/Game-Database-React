import { useState, useEffect } from "react";

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      const percentage = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      setProgress(percentage);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "2px",
        width: `${progress}%`,
        background: "linear-gradient(90deg, #22c55e, #60a5fa)",
        transition: "width 0.1s linear",
        zIndex: 9999,
      }}
    />
  );
}

export default ScrollProgressBar;
