import { useEffect, useState } from "react";

// The API answers in one response, so these follow the clock rather than
// real progress. They roughly match where the planner spends its time.
const STAGES = [
  { label: "Reading your request", from: 0 },
  { label: "Finding the places", from: 4 },
  { label: "Routing the roads", from: 9 },
  { label: "Looking for stops along the way", from: 18 },
  { label: "Polishing the final route", from: 35 },
];

export default function PlanningOverlay({ prompt }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(timer);
  }, []);

  const current = STAGES.findLastIndex((stage) => seconds >= stage.from);

  return (
    <div className="planning-overlay" role="status" aria-live="polite">
      <div className="planning-card">
        <div className="planning-head">
          <div className="planning-spinner" aria-hidden="true">
            <span />
          </div>
          <div>
            <h2>Planning your route</h2>
            <p className="muted">This usually takes up to a minute · {formatElapsed(seconds)}</p>
          </div>
        </div>

        <blockquote className="planning-prompt">{prompt}</blockquote>

        <ol className="planning-stages">
          {STAGES.map((stage, index) => (
            <li
              key={stage.label}
              className={index < current ? "done" : index === current ? "active" : ""}
            >
              <span className="stage-dot" aria-hidden="true" />
              {stage.label}
            </li>
          ))}
        </ol>

        <div className="planning-bar" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}
