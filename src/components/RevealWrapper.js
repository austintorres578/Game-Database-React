import { useScrollReveal } from "../hooks/useScrollReveal";
import "../styles/reveal.css";

export function RevealWrapper({ direction = "up", delay = 0, children }) {
  const { ref, visible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`reveal-wrapper reveal-${direction}${visible ? " visible" : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
