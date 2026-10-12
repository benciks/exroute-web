import { useEffect, useMemo, useRef, useState } from "react";
import { createRoute, downloadGpx, listRoutes } from "./api.js";
import {
  buildItinerary,
  decodeShape,
  formatAge,
  formatDuration,
  formatKm,
  isLoop,
  markerLabel,
  routeTitle,
  viaNames,
} from "./itinerary.js";
import {
  ArrowIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  EditIcon,
  LogoMark,
  LogoutIcon,
  LoopIcon,
  PinIcon,
  RoadIcon,
  SparkIcon,
} from "./icons.jsx";
import PlanningOverlay from "./PlanningOverlay.jsx";
import RouteMap from "./RouteMap.jsx";

const EXAMPLES = [
  "100 km loop from Brno with curvy roads and a nice castle",
  "Brno to Český Krumlov avoiding motorways, lunch stop on the way",
  "2 hour ride from Olomouc, twisty roads, coffee halfway",
];

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

export default function Planner({ token, onLogout }) {
  const [routes, setRoutes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [planning, setPlanning] = useState(null);
  const [error, setError] = useState(null);
  const [focusedStop, setFocusedStop] = useState(null);
  const textareaRef = useRef(null);

  // An expired token sends the user back to login, anything else is shown
  function handleError(e) {
    if (e.status === 401) onLogout();
    else setError(e.message);
  }

  useEffect(() => {
    listRoutes(token)
      .then(setRoutes)
      .catch(handleError)
      .finally(() => setLoaded(true));
  }, [token]);

  async function plan(event) {
    event?.preventDefault();
    if (planning || !instructions.trim()) return;
    setPlanning(instructions);
    setError(null);
    try {
      const result = await createRoute(token, instructions);
      setRoutes(await listRoutes(token));
      setSelectedId(result.id);
      setFocusedStop(null);
    } catch (e) {
      handleError(e);
    } finally {
      setPlanning(null);
    }
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) plan(event);
  }

  function select(route) {
    setSelectedId(route.id);
    setFocusedStop(null);
  }

  function editPrompt(route) {
    setInstructions(route.instructions);
    textareaRef.current?.focus();
  }

  // Decoding every shape once tells loops from one-way routes for the list titles
  const loops = useMemo(
    () => new Map(routes.map((route) => [route.id, isLoop(decodeShape(route.polyline))])),
    [routes],
  );

  const selected = routes.find((route) => route.id === selectedId) ?? routes[0];
  const shape = useMemo(() => (selected ? decodeShape(selected.polyline) : []), [selected]);
  const itinerary = useMemo(() => (selected ? buildItinerary(selected, shape) : null), [selected, shape]);

  return (
    <div className="planner">
      <RouteMap shape={shape} stops={itinerary?.stops ?? []} loop={itinerary?.loop} focusedStop={focusedStop} />

      <aside className="panel">
        <header className="panel-header">
          <div className="brand">
            <LogoMark />
            <span>exroute</span>
          </div>
          <button className="ghost icon-button" onClick={onLogout} title="Log out">
            <LogoutIcon />
            <span>Log out</span>
          </button>
        </header>

        <div className="panel-scroll">
          <form className="composer" onSubmit={plan}>
            <label htmlFor="instructions" className="composer-label">
              Where do you want to ride?
            </label>
            <textarea
              id="instructions"
              ref={textareaRef}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="100 km loop from Brno with curvy roads and a nice castle"
              rows={3}
              maxLength={1000}
              required
            />
            {!instructions && (
              <div className="examples">
                {EXAMPLES.map((example) => (
                  <button type="button" key={example} className="chip" onClick={() => setInstructions(example)}>
                    {example}
                  </button>
                ))}
              </div>
            )}
            <div className="composer-footer">
              <span className="hint">
                <kbd>{IS_MAC ? "⌘" : "Ctrl"}</kbd> <kbd>Enter</kbd> to plan
              </span>
              <div className="composer-actions">
                {instructions && !planning && (
                  <button type="button" className="ghost" onClick={() => setInstructions("")}>
                    Clear
                  </button>
                )}
                <button type="submit" className="primary" disabled={Boolean(planning)}>
                  <SparkIcon />
                  {planning ? "Planning…" : "Plan route"}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="alert" role="alert">
              <p>{error}</p>
              <button className="ghost icon-only" onClick={() => setError(null)} aria-label="Dismiss">
                <CloseIcon />
              </button>
            </div>
          )}

          {selected && itinerary && (
            <section className="details" key={selected.id}>
              <div className="details-head">
                <span className="badge">
                  {itinerary.loop ? <LoopIcon size={13} /> : <ArrowIcon size={13} />}
                  {itinerary.loop ? "Loop" : "One way"}
                </span>
                <span className="muted small">{formatAge(selected.created_at)}</span>
              </div>
              <h2 className="details-title">{routeTitle(selected, itinerary.loop)}</h2>

              <div className="stats">
                <Stat icon={<RoadIcon />} value={formatKm(selected.distance_km)} label="Distance" />
                <Stat icon={<ClockIcon />} value={formatDuration(selected.duration_min)} label="Riding time" />
                <Stat icon={<PinIcon />} value={Math.max(0, itinerary.stops.length - 2)} label="Stops" />
              </div>

              <div className="prompt">
                <p>“{selected.instructions}”</p>
                <button className="ghost small-button" onClick={() => editPrompt(selected)}>
                  <EditIcon size={14} /> Edit &amp; re-plan
                </button>
              </div>

              <h3 className="section-label">Itinerary</h3>
              <ol className="timeline">
                {itinerary.stops.map((stop, index) => (
                  <li key={index} className={`timeline-item is-${stop.kind}`}>
                    <button
                      className={focusedStop === index ? "stop focused" : "stop"}
                      onClick={() => setFocusedStop(focusedStop === index ? null : index)}
                    >
                      <span className="stop-marker">{markerLabel(stop, index, itinerary.loop)}</span>
                      <span className="stop-body">
                        <span className="stop-name">{stop.name}</span>
                        <span className="stop-meta">
                          {stopCaption(stop, itinerary.loop)}
                          {stop.atKm != null && index > 0 && ` · km ${Math.round(stop.atKm)}`}
                        </span>
                      </span>
                    </button>
                    {itinerary.legs[index] && (
                      <div className="leg">
                        <span>{formatKm(itinerary.legs[index].km)}</span>
                        <span className="leg-dot" />
                        <span>~{formatDuration(itinerary.legs[index].minutes)}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              <button
                className="secondary full"
                onClick={() => downloadGpx(token, selected).catch(handleError)}
              >
                <DownloadIcon /> Download GPX
              </button>
            </section>
          )}

          <section className="history">
            <h3 className="section-label">
              Your routes {routes.length > 0 && <span className="count">{routes.length}</span>}
            </h3>
            {loaded && routes.length === 0 && (
              <p className="empty muted">No routes yet. Describe a ride above and it will show up here.</p>
            )}
            <ul className="route-list">
              {routes.map((route) => {
                const loop = loops.get(route.id);
                const via = viaNames(route, loop);
                return (
                  <li key={route.id}>
                    <button
                      className={route.id === selected?.id ? "route-card active" : "route-card"}
                      onClick={() => select(route)}
                      title={route.instructions}
                    >
                      <span className="route-icon">{loop ? <LoopIcon /> : <ArrowIcon />}</span>
                      <span className="route-text">
                        <span className="route-title">{routeTitle(route, loop)}</span>
                        {via.length > 0 && <span className="route-via">via {formatVia(via)}</span>}
                        <span className="route-meta">
                          {formatKm(route.distance_km)} · {formatDuration(route.duration_min)} ·{" "}
                          {formatAge(route.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </aside>

      {planning && <PlanningOverlay prompt={planning} />}
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function stopCaption(stop, loop) {
  if (stop.kind === "start") return "Start";
  if (stop.kind === "finish") return loop ? "Back to start" : "Finish";
  return "Stop";
}

function formatVia(names) {
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
