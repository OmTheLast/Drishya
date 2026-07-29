"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Prediction = "left" | "right" | null;
type InsightTab = "intuition" | "equations" | "challenge";

const SPEEDS = [0.25, 0.5, 1];
const MAX_SLIDE = 4.6;
const PX_PER_METER = 42;

function format(value: number, decimals = 2) {
  return Number.isFinite(value) ? value.toFixed(decimals) : "—";
}

export default function WedgeLab() {
  const [wedgeMass, setWedgeMass] = useState(5);
  const [blockMass, setBlockMass] = useState(2);
  const [angle, setAngle] = useState(30);
  const [gravity, setGravity] = useState(9.8);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showForces, setShowForces] = useState(true);
  const [showVelocity, setShowVelocity] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [activeTab, setActiveTab] = useState<InsightTab>("intuition");
  const lastFrame = useRef<number | null>(null);

  const physics = useMemo(() => {
    const theta = (angle * Math.PI) / 180;
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    const denominator = wedgeMass + blockMass * sin * sin;
    const relativeAcceleration =
      (gravity * sin * (wedgeMass + blockMass)) / denominator;
    const wedgeAcceleration =
      (-blockMass * gravity * sin * cos) / denominator;
    const blockAx = (wedgeMass * gravity * sin * cos) / denominator;
    const blockAy =
      (-gravity * (wedgeMass + blockMass) * sin * sin) / denominator;
    const normal =
      (blockMass * gravity * wedgeMass * cos) / denominator;

    return {
      theta,
      sin,
      cos,
      relativeAcceleration,
      wedgeAcceleration,
      blockAx,
      blockAy,
      normal,
    };
  }, [angle, blockMass, gravity, wedgeMass]);

  const slide = Math.min(
    MAX_SLIDE,
    0.5 * physics.relativeAcceleration * time * time,
  );
  const wedgeX = 0.5 * physics.wedgeAcceleration * time * time;
  const relativeVelocity = physics.relativeAcceleration * time;
  const ended = slide >= MAX_SLIDE;

  const resetMotion = useCallback(() => {
    setRunning(false);
    setTime(0);
    lastFrame.current = null;
  }, []);

  useEffect(() => {
    resetMotion();
  }, [wedgeMass, blockMass, angle, gravity, resetMotion]);

  useEffect(() => {
    if (!running) {
      lastFrame.current = null;
      return;
    }

    let frameId = 0;
    const animate = (now: number) => {
      if (lastFrame.current === null) lastFrame.current = now;
      const delta = Math.min((now - lastFrame.current) / 1000, 0.04);
      lastFrame.current = now;
      setTime((current) => current + delta * SPEEDS[speedIndex]);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [running, speedIndex]);

  useEffect(() => {
    if (ended) setRunning(false);
  }, [ended]);

  const choosePrediction = (choice: Exclude<Prediction, null>) => {
    setPrediction(choice);
    setSubmitted(true);
    resetMotion();
  };

  const step = (direction: 1 | -1) => {
    setRunning(false);
    setTime((current) => Math.max(0, current + direction * 0.08));
  };

  const replay = () => {
    if (!submitted) return;
    if (ended) setTime(0);
    setRunning((current) => !current);
  };

  const switchSpeed = () => {
    setSpeedIndex((current) => (current + 1) % SPEEDS.length);
  };

  const trailDots = Array.from({ length: 7 }, (_, index) => {
    const trailTime = Math.max(0, time - (index + 1) * 0.1);
    const trailSlide = Math.min(
      MAX_SLIDE,
      0.5 * physics.relativeAcceleration * trailTime * trailTime,
    );
    return {
      left: 65 + trailSlide * physics.cos * PX_PER_METER,
      top: 35 + trailSlide * physics.sin * PX_PER_METER,
      opacity: Math.max(0.08, 0.55 - index * 0.07),
    };
  });

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Drishya home">
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
          <span>
            <strong>DRISHYA</strong>
            <small>PHYSICS YOU CAN SEE</small>
          </span>
        </a>

        <div className="lab-identity">
          <span className="chapter-kicker">MECHANICS · LAB 01</span>
          <span className="lab-title">The runaway wedge</span>
        </div>

        <div className="course-progress" aria-label="Course progress">
          <span>01</span>
          <div className="progress-track">
            <i />
          </div>
          <span className="muted">07</span>
          <button className="icon-button" aria-label="Open lab notes">
            ↗
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className="simulation-column">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE SETUP</span>
              <h1>A block. A wedge. No friction.</h1>
            </div>
            <p>
              Release the block from rest. The ground exerts no horizontal
              force on the system.
            </p>
          </div>

          <div className="simulation-card">
            <div className="stage-toolbar">
              <div className="status-cluster">
                <span className={`status-dot ${running ? "live" : ""}`} />
                <span>{running ? "SIMULATING" : ended ? "COMPLETE" : "READY"}</span>
                <span className="time-readout">t = {format(time)} s</span>
              </div>
              <div className="frame-switch">
                <button className="active">GROUND FRAME</button>
                <button disabled title="Coming in the next lab iteration">
                  WEDGE FRAME
                </button>
              </div>
            </div>

            <div className={`stage ${!submitted ? "stage-locked" : ""}`}>
              <div className="stage-grid" />
              <div className="conservation-label">
                ΣF<sub>x, external</sub> = 0
              </div>
              <div className="ground-line">
                <span>FRICTIONLESS GROUND</span>
              </div>

              <div
                className="wedge-system"
                style={{
                  transform: `translateX(${wedgeX * PX_PER_METER}px)`,
                }}
              >
                <div className="wedge-shadow" />
                <div className="wedge">
                  <span className="mass-label">
                    M = {format(wedgeMass, 1)} kg
                  </span>
                  <span className="angle-label">θ = {angle}°</span>
                </div>

                {showTrail &&
                  time > 0 &&
                  trailDots.map((dot, index) => (
                    <i
                      className="trail-dot"
                      key={index}
                      style={{
                        left: dot.left,
                        top: dot.top,
                        opacity: dot.opacity,
                      }}
                    />
                  ))}

                <div
                  className="block"
                  style={{
                    left: 48 + slide * physics.cos * PX_PER_METER,
                    top: 12 + slide * physics.sin * PX_PER_METER,
                    transform: `rotate(${angle}deg)`,
                  }}
                >
                  <span>m</span>
                  <em>{format(blockMass, 1)} kg</em>
                  {showForces && (
                    <>
                      <i
                        className="vector vector-weight"
                        style={{ transform: `rotate(${90 - angle}deg)` }}
                      >
                        <b>mg</b>
                      </i>
                      <i
                        className="vector vector-normal"
                        style={{ transform: `rotate(${-90}deg)` }}
                      >
                        <b>N</b>
                      </i>
                    </>
                  )}
                  {showVelocity && time > 0.04 && (
                    <i className="vector vector-velocity">
                      <b>v<sub>rel</sub></b>
                    </i>
                  )}
                </div>

                <div
                  className="wedge-motion"
                  style={{ opacity: time > 0.05 ? 1 : 0.2 }}
                >
                  <i />
                  <span>a<sub>w</sub></span>
                </div>
              </div>

              {!submitted && (
                <div className="stage-lock">
                  <span>01</span>
                  <strong>Make a prediction to unlock motion</strong>
                  <small>Intuition comes before calculation.</small>
                </div>
              )}
            </div>

            <div className="playback">
              <div className="playback-buttons">
                <button
                  aria-label="Step backward"
                  onClick={() => step(-1)}
                  disabled={!submitted || time === 0}
                >
                  −▮
                </button>
                <button
                  className="play-button"
                  aria-label={running ? "Pause simulation" : "Play simulation"}
                  onClick={replay}
                  disabled={!submitted}
                >
                  {running ? "Ⅱ" : "▶"}
                </button>
                <button
                  aria-label="Step forward"
                  onClick={() => step(1)}
                  disabled={!submitted || ended}
                >
                  ▮+
                </button>
                <button className="reset-button" onClick={resetMotion}>
                  ↺ RESET
                </button>
              </div>

              <div className="timeline">
                <div className="timeline-track">
                  <i style={{ width: `${(slide / MAX_SLIDE) * 100}%` }} />
                </div>
              </div>

              <button className="speed-button" onClick={switchSpeed}>
                {SPEEDS[speedIndex]}× SPEED
              </button>
            </div>
          </div>

          <div className="measurement-strip">
            <Measurement
              label="WEDGE ACCELERATION"
              value={`${format(Math.abs(physics.wedgeAcceleration))} m/s²`}
              note="← left"
              tone="orange"
            />
            <Measurement
              label="BLOCK, ALONG WEDGE"
              value={`${format(physics.relativeAcceleration)} m/s²`}
              note="down the plane"
              tone="blue"
            />
            <Measurement
              label="NORMAL REACTION"
              value={`${format(physics.normal)} N`}
              note={`${format((physics.normal / (blockMass * gravity)) * 100, 0)}% of mg`}
              tone="green"
            />
            <Measurement
              label="RELATIVE SPEED"
              value={`${format(relativeVelocity)} m/s`}
              note={time === 0 ? "at release" : `at ${format(time)} s`}
              tone="violet"
            />
          </div>
        </section>

        <aside className="control-column">
          <section className="prediction-panel">
            <div className="panel-index">01</div>
            <div className="panel-heading">
              <span className="eyebrow">PREDICT</span>
              <h2>Which way will the wedge move?</h2>
              <p>Commit before you press play. No equations yet.</p>
            </div>

            <div className="prediction-options">
              <button
                className={prediction === "left" ? "selected" : ""}
                onClick={() => choosePrediction("left")}
              >
                <span className="direction-icon">←</span>
                <span>
                  <strong>To the left</strong>
                  <small>Away from the sliding block</small>
                </span>
                <i>{prediction === "left" ? "✓" : ""}</i>
              </button>
              <button
                className={prediction === "right" ? "selected wrong" : ""}
                onClick={() => choosePrediction("right")}
              >
                <span className="direction-icon">→</span>
                <span>
                  <strong>To the right</strong>
                  <small>Along with the sliding block</small>
                </span>
                <i>{prediction === "right" ? "×" : ""}</i>
              </button>
            </div>

            {submitted && (
              <div
                className={`prediction-feedback ${
                  prediction === "left" ? "correct" : "rethink"
                }`}
              >
                <strong>
                  {prediction === "left"
                    ? "Correct — now prove it."
                    : "Good hypothesis — watch the centre of mass."}
                </strong>
                <span>
                  With no external horizontal force, the system&apos;s horizontal
                  centre of mass cannot accelerate.
                </span>
              </div>
            )}
          </section>

          <section className="parameter-panel">
            <div className="panel-index">02</div>
            <div className="panel-heading compact">
              <span className="eyebrow">EXPERIMENT</span>
              <h2>Change the physical world</h2>
            </div>

            <RangeControl
              label="Wedge mass"
              symbol="M"
              value={wedgeMass}
              min={2}
              max={12}
              step={0.5}
              unit="kg"
              onChange={setWedgeMass}
            />
            <RangeControl
              label="Block mass"
              symbol="m"
              value={blockMass}
              min={0.5}
              max={6}
              step={0.5}
              unit="kg"
              onChange={setBlockMass}
            />
            <RangeControl
              label="Incline angle"
              symbol="θ"
              value={angle}
              min={15}
              max={60}
              step={1}
              unit="°"
              onChange={setAngle}
            />
            <RangeControl
              label="Gravity"
              symbol="g"
              value={gravity}
              min={1.6}
              max={12}
              step={0.1}
              unit="m/s²"
              onChange={setGravity}
            />

            <div className="overlay-controls">
              <span>VISUAL OVERLAYS</span>
              <Toggle
                label="Force vectors"
                active={showForces}
                onClick={() => setShowForces((value) => !value)}
              />
              <Toggle
                label="Velocity vector"
                active={showVelocity}
                onClick={() => setShowVelocity((value) => !value)}
              />
              <Toggle
                label="Motion trail"
                active={showTrail}
                onClick={() => setShowTrail((value) => !value)}
              />
            </div>
          </section>
        </aside>
      </div>

      <section className="insight-section">
        <div className="insight-tabs" role="tablist" aria-label="Learning panels">
          {(
            [
              ["intuition", "03 · SEE THE IDEA"],
              ["equations", "04 · CONNECT THE MATH"],
              ["challenge", "05 · TEST YOURSELF"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "intuition" && (
          <div className="insight-content intuition-content">
            <div className="idea-number">01</div>
            <div>
              <span className="eyebrow">THE ANCHOR IDEA</span>
              <h2>The centre of mass refuses to drift.</h2>
            </div>
            <p>
              The block gains momentum to the right. Because the ground cannot
              provide a horizontal impulse, the wedge must gain exactly the
              opposite momentum. The two motions are not separate stories—they
              are one constraint.
            </p>
            <div className="momentum-balance">
              <span>
                <i className="orange-line" />
                p<sub>wedge</sub>
              </span>
              <strong>+</strong>
              <span>
                <i className="blue-line" />
                p<sub>block,x</sub>
              </span>
              <strong>= 0</strong>
            </div>
          </div>
        )}

        {activeTab === "equations" && (
          <div className="insight-content equation-content">
            <div>
              <span className="eyebrow">CHOOSE TWO COORDINATES</span>
              <h2>Let X track the wedge and s track the block.</h2>
            </div>
            <div className="equation-card">
              <span>Horizontal momentum constraint</span>
              <strong>
                (M + m)Ẍ + m s̈ cos θ = 0
              </strong>
            </div>
            <div className="equation-card accent">
              <span>Acceleration down the wedge</span>
              <strong>
                s̈ ={" "}
                <span className="fraction">
                  <i>(M + m)g sin θ</i>
                  <i>M + m sin² θ</i>
                </span>
              </strong>
            </div>
            <p>
              Substitute the second equation into the first: Ẍ is negative,
              so the wedge accelerates left.
            </p>
          </div>
        )}

        {activeTab === "challenge" && (
          <div className="insight-content challenge-content">
            <div>
              <span className="eyebrow">LIMITING-CASE CHECK</span>
              <h2>Make the wedge infinitely heavy.</h2>
              <p>
                Drag M towards its maximum. What should happen to the wedge
                acceleration—and what familiar result should s̈ approach?
              </p>
            </div>
            <div className="challenge-answer">
              <span>AS M → ∞</span>
              <strong>
                a<sub>w</sub> → 0
              </strong>
              <strong>
                s̈ → g sin θ
              </strong>
            </div>
          </div>
        )}
      </section>

      <footer>
        <span>DRISHYA · MECHANICS LABS</span>
        <span>Observe → Predict → Explain → Transfer</span>
        <span>Built for questions that resist memorisation.</span>
      </footer>
    </main>
  );
}

function Measurement({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className={`measurement ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function RangeControl({
  label,
  symbol,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <label className="range-control">
      <span className="range-label">
        <span>
          <i>{symbol}</i>
          {label}
        </span>
        <strong>
          {value} <small>{unit}</small>
        </strong>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--range-fill": `${percentage}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="range-bounds">
        <i>{min}</i>
        <i>{max}</i>
      </span>
    </label>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="toggle-row"
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      <span>{label}</span>
      <i className={active ? "active" : ""}>
        <b />
      </i>
    </button>
  );
}
