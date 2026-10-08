"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createPulleySystem,
  pulleyResiduals,
  pulleyStateAt,
} from "../lib/pulleyPhysics.mjs";

type Prediction = "m1" | "m2" | "balance" | null;
type GuideStep = 0 | 1 | 2 | 3;
type Focus = "start" | "m1" | "m2" | "gravity";

const SPEEDS = [0.25, 0.5, 1];
const MOTION_SCALE = 42;

function format(value: number, decimals = 2) {
  return Number.isFinite(value) ? value.toFixed(decimals) : "—";
}

export default function PulleyLab() {
  const [mass1, setMass1] = useState(3);
  const [mass2, setMass2] = useState(4);
  const [gravity, setGravity] = useState(9.8);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showForces, setShowForces] = useState(true);
  const [showVelocity, setShowVelocity] = useState(false);
  const [guideStep, setGuideStep] = useState<GuideStep>(0);
  const [focus, setFocus] = useState<Focus>("start");
  const timeRef = useRef(0);
  const lastFrame = useRef<number | null>(null);

  const physics = useMemo(
    () => createPulleySystem({ mass1, mass2, gravity }),
    [gravity, mass1, mass2],
  );
  const world = useMemo(() => pulleyStateAt(physics, time), [physics, time]);
  const residuals = useMemo(
    () => pulleyResiduals(physics, world),
    [physics, world],
  );
  const correctPrediction: Exclude<Prediction, null> = physics.isBalanced
    ? "balance"
    : physics.acceleration1 > 0
      ? "m1"
      : "m2";
  const predictionCorrect = prediction === correctPrediction;
  const ended = world.atBoundary;
  const freeMassY = 165 + world.displacement1 * MOTION_SCALE;
  const movablePulleyY = 225 + world.displacement2 * MOTION_SCALE;

  const resetMotion = useCallback(() => {
    setRunning(false);
    setTime(0);
    timeRef.current = 0;
    lastFrame.current = null;
  }, []);

  useEffect(() => {
    if (!running) {
      lastFrame.current = null;
      return;
    }
    let frame = 0;
    const animate = (now: number) => {
      if (lastFrame.current === null) lastFrame.current = now;
      const delta = Math.min((now - lastFrame.current) / 1000, 0.04);
      lastFrame.current = now;
      const next = Math.min(
        physics.endTime,
        timeRef.current + delta * SPEEDS[speedIndex],
      );
      timeRef.current = next;
      setTime(next);
      if (next >= physics.endTime) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [physics.endTime, running, speedIndex]);

  const choosePrediction = (choice: Exclude<Prediction, null>) => {
    setPrediction(choice);
    setSubmitted(true);
    resetMotion();
  };

  const replay = () => {
    if (!submitted || physics.isBalanced) return;
    if (ended) resetMotion();
    setRunning((value) => !value);
  };

  const step = (direction: 1 | -1) => {
    if (physics.isBalanced) return;
    setRunning(false);
    const next = Math.min(
      physics.endTime,
      Math.max(0, timeRef.current + direction * 0.08),
    );
    timeRef.current = next;
    setTime(next);
  };

  const cue = useMemo(() => {
    if (focus === "m1") {
      return `Changing m₁ changes both the driving weight and the tension. Compare 2m₁ = ${format(2 * mass1, 1)} kg with m₂ = ${format(mass2, 1)} kg—not m₁ with m₂.`;
    }
    if (focus === "m2") {
      return `The movable pulley gives m₂ two upward tensions. At m₂ = ${format(mass2, 1)} kg, the system is ${physics.isBalanced ? "exactly balanced" : physics.direction === "mass2-down" ? "pulled downward by m₂" : "pulled downward by m₁"}.`;
    }
    if (focus === "gravity") {
      return `Changing g rescales T and both accelerations, but it cannot reverse the direction: that depends only on whether 2m₁ is greater or less than m₂.`;
    }
    return "Change either mass. The tutor will recalculate the direction, tension, acceleration ratio and the relevant JEE trap.";
  }, [focus, mass1, mass2, physics.direction, physics.isBalanced]);

  return (
    <main className="app-shell pulley-lab">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Drishya home">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span><strong>DRISHYA</strong><small>PHYSICS YOU CAN SEE</small></span>
        </a>
        <div className="lab-identity">
          <span className="chapter-kicker">MECHANICS · LAB 02</span>
          <span className="lab-title">The hidden length</span>
        </div>
        <div className="course-progress" aria-label="Course progress">
          <span>02</span><div className="progress-track"><i className="progress-two" /></div><span className="muted">07</span>
        </div>
      </header>

      <div className="workspace">
        <section className="simulation-column">
          <div className="section-heading">
            <div><span className="eyebrow">THE SETUP</span><h1>One rope. Two motions.</h1></div>
            <p>A fixed pulley redirects the rope. A movable pulley makes one body move half as far—and doubles the upward tension on it.</p>
          </div>

          <div className="simulation-card">
            <div className="stage-toolbar">
              <div className="status-cluster">
                <span className={`status-dot ${running ? "live" : ""}`} />
                <span>{running ? "SIMULATING" : physics.isBalanced ? "BALANCED" : ended ? "LIMIT REACHED" : "READY"}</span>
                <span className="time-readout">t = {format(world.time)} s</span>
              </div>
              <div className="stage-actions">
                <button className={`guide-toggle ${showGuide ? "active" : ""}`} aria-pressed={showGuide} onClick={() => setShowGuide((v) => !v)}>
                  {showGuide ? "GUIDE ON" : "GUIDE OFF"}
                </button>
                <div className="pulley-integrity" title={`Constraint residual: ${residuals.positionConstraint.toExponential(2)} m`}>
                  <i /> ROPE LENGTH FIXED
                </div>
              </div>
            </div>

            <div className={`stage pulley-stage ${!submitted ? "stage-locked" : ""}`}>
              <div className="stage-grid" />
              <svg className="pulley-world" viewBox="0 0 900 440" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A free mass connected through a fixed pulley to a movable pulley carrying a second mass">
                <defs>
                  <marker id="arrow-orange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#f36b3f" /></marker>
                  <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#2f80c9" /></marker>
                  <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#2d9c70" /></marker>
                </defs>
                <line x1="235" y1="38" x2="510" y2="38" className="pulley-ceiling" />
                <path d={`M326 ${freeMassY} L326 90 A34 34 0 0 1 394 90 L394 ${movablePulleyY} A34 34 0 0 0 462 ${movablePulleyY} L462 38`} className="pulley-rope" />
                <circle cx="360" cy="90" r="34" className="pulley-wheel fixed" />
                <circle cx="360" cy="90" r="6" className="pulley-hub" />
                <g transform={`translate(0 ${world.displacement2 * MOTION_SCALE})`}>
                  <circle cx="428" cy="225" r="34" className="pulley-wheel moving" />
                  <circle cx="428" cy="225" r="6" className="pulley-hub" />
                  <line x1="428" y1="259" x2="428" y2="287" className="pulley-link" />
                </g>
                <g transform={`translate(0 ${world.displacement1 * MOTION_SCALE})`}>
                  <rect x="291" y="165" width="70" height="70" rx="4" className="pulley-mass mass-one" />
                  <text x="326" y="194" className="pulley-mass-symbol">m₁</text>
                  <text x="326" y="215" className="pulley-mass-value">{format(mass1, 1)} kg</text>
                  {showForces && <><line x1="326" y1="225" x2="326" y2="282" className="force-line weight-line" markerEnd="url(#arrow-orange)" /><text x="337" y="274" className="force-text weight-text">m₁g</text><line x1="305" y1="165" x2="305" y2="118" className="force-line tension-line" markerEnd="url(#arrow-blue)" /><text x="286" y="126" className="force-text tension-text">T</text></>}
                  {showVelocity && time > 0.04 && <line x1="350" y1="200" x2="350" y2={200 + Math.sign(world.velocity1) * 48} className="force-line velocity-line" markerEnd="url(#arrow-green)" />}
                </g>
                <g transform={`translate(0 ${world.displacement2 * MOTION_SCALE})`}>
                  <rect x="386" y="287" width="84" height="72" rx="4" className="pulley-mass mass-two" />
                  <text x="428" y="317" className="pulley-mass-symbol">m₂</text>
                  <text x="428" y="339" className="pulley-mass-value">{format(mass2, 1)} kg</text>
                  {showForces && <><line x1="428" y1="350" x2="428" y2="407" className="force-line weight-line" markerEnd="url(#arrow-orange)" /><text x="440" y="397" className="force-text weight-text">m₂g</text><line x1="399" y1="225" x2="399" y2="167" className="force-line tension-line" markerEnd="url(#arrow-blue)" /><line x1="457" y1="225" x2="457" y2="167" className="force-line tension-line" markerEnd="url(#arrow-blue)" /><text x="468" y="176" className="force-text tension-text">2T total</text></>}
                  {showVelocity && time > 0.04 && <line x1="458" y1="323" x2="458" y2={323 + Math.sign(world.velocity2) * 48} className="force-line velocity-line" markerEnd="url(#arrow-green)" />}
                </g>
                <text x="246" y="66" className="apparatus-label">FIXED PULLEY · REDIRECTS</text>
                <text x="505" y="224" className="apparatus-label">MOVABLE PULLEY · 2 SUPPORTING SEGMENTS</text>
                <g className="constraint-stamp"><rect x="610" y="52" width="220" height="55" rx="3" /><text x="628" y="76">Δy₁ + 2Δy₂ = 0</text><text x="628" y="94">a₁ + 2a₂ = 0</text></g>
              </svg>

              {showGuide && submitted && !ended && (
                <div className="coach-overlay pulley-coach" aria-live="polite">
                  <div className="coach-nav" role="tablist" aria-label="Adaptive pulley lesson">
                    {(["ROPE", "FORCES", "DIRECTION", "MOTION"] as const).map((label, index) => (
                      <button key={label} role="tab" aria-selected={guideStep === index} className={guideStep === index ? "active" : ""} onClick={() => setGuideStep(index as GuideStep)}><span>0{index + 1}</span>{label}</button>
                    ))}
                  </div>
                  {guideStep === 0 && <div className="coach-body"><span className="coach-kicker">01 · TRACE EVERY CHANGING SEGMENT</span><strong>The moving pulley changes two rope lengths at once.</strong><p>If m₂ moves down by x, both supporting segments grow by x. The free end must therefore rise by 2x.</p><div className="constraint-proof"><span>Position <b>Δy₁ + 2Δy₂ = 0</b></span><span>Velocity <b>v₁ + 2v₂ = 0</b></span><span>Acceleration <b>a₁ + 2a₂ = 0</b></span></div><div className="jee-trap"><span>JEE TRAP</span><p>Equal rope tension does not mean equal accelerations. Geometry sets the acceleration ratio before forces are solved.</p></div></div>}
                  {guideStep === 1 && <div className="coach-body"><span className="coach-kicker">02 · DRAW EACH BODY SEPARATELY</span><strong>m₁ feels T upward; the movable assembly feels 2T upward.</strong><p>The same ideal-rope tension acts in every segment, but two segments support the moving pulley.</p><div className="coach-equation-stack"><span><i className="metric-orange" />Free mass <b>m₁g − T = m₁a₁</b></span><span><i className="metric-blue" />Moving mass <b>m₂g − 2T = m₂a₂</b></span><span><i className="metric-violet" />Solved tension <b>T = {format(physics.tension, 2)} N</b></span></div><div className="jee-trap"><span>JEE TRAP</span><p>The movable pulley does not create 2T in one string. It receives T from each of two string segments.</p></div></div>}
                  {guideStep === 2 && <div className="coach-body"><span className="coach-kicker">03 · PREDICT BEFORE ALGEBRA</span><strong>{physics.isBalanced ? "The system is exactly balanced." : physics.direction === "mass1-down" ? "m₁ moves down; the movable pulley rises." : "m₂ moves down; the free end rises twice as far."}</strong><p>Balance requires m₂g = 2m₁g, so compare m₂ with 2m₁—not with m₁.</p><div className="regime-comparison"><span>2m₁ <b>{format(2 * mass1, 1)} kg</b></span><span>m₂ <b>{format(mass2, 1)} kg</b></span><strong className={physics.isBalanced ? "regime-static" : "regime-slide"}>{physics.isBalanced ? "BALANCED" : physics.direction === "mass1-down" ? "m₁ ↓" : "m₂ ↓"}</strong></div><div className="jee-trap"><span>LIMIT CHECK</span><p>When m₂ = 2m₁, a₁ = a₂ = 0 and T = m₁g = m₂g/2.</p></div></div>}
                  {guideStep === 3 && <div className="coach-body"><span className="coach-kicker">04 · CONNECT CONSTRAINT TO KINEMATICS</span><strong>{physics.isBalanced ? "Both accelerations vanish at exact balance." : "The free end has twice the acceleration magnitude."}</strong><p>Here a₁ = {format(physics.acceleration1)} m/s² and a₂ = {format(physics.acceleration2)} m/s². Their opposite signs encode opposite directions.</p><div className="coach-metrics kinematics-grid"><span>a₁<b>{format(physics.acceleration1)} m/s²</b></span><span>a₂<b>{format(physics.acceleration2)} m/s²</b></span><span>v₁<b>{format(world.velocity1)} m/s</b></span><span>v₂<b>{format(world.velocity2)} m/s</b></span></div><div className="jee-trap"><span>CHECK</span><p>{physics.isBalanced ? "Perturb either mass: once motion begins, the rope immediately enforces a₁ = −2a₂." : "a₁/a₂ = −2. If your algebra loses this ratio, the rope constraint was applied incorrectly."}</p></div></div>}
                  <div className="adaptive-cue"><span>LIVE TUTOR</span><p>{cue}</p></div>
                </div>
              )}

              {ended && submitted && <div className="event-marker"><span>MODEL BOUNDARY</span><strong>The apparatus reached its visual travel limit.</strong><small>Replay or change a mass. The ideal equations remain valid until a body contacts the pulley or floor.</small></div>}
              {!submitted && <div className="stage-lock"><span>01</span><strong>Predict which body descends</strong><small>Trace the rope before touching the equations.</small></div>}
            </div>

            <div className="playback">
              <div className="playback-buttons"><button aria-label="Step backward" onClick={() => step(-1)} disabled={!submitted || physics.isBalanced || time === 0}>−▮</button><button className="play-button" aria-label={running ? "Pause simulation" : "Play simulation"} onClick={replay} disabled={!submitted || physics.isBalanced}>{running ? "Ⅱ" : "▶"}</button><button aria-label="Step forward" onClick={() => step(1)} disabled={!submitted || physics.isBalanced || ended}>▮+</button><button className="reset-button" onClick={resetMotion}>↺ RESET</button></div>
              <div className="timeline"><div className="timeline-track"><i style={{ width: `${world.progress * 100}%` }} /></div></div>
              <button className="speed-button" onClick={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}>{SPEEDS[speedIndex]}× SPEED</button>
            </div>
          </div>

          <div className="measurement-strip">
            <PulleyMeasurement label="FREE MASS · a₁" value={`${format(physics.acceleration1)} m/s²`} note={physics.isBalanced ? "stationary" : physics.acceleration1 > 0 ? "↓ downward" : "↑ upward"} tone="orange" />
            <PulleyMeasurement label="MOVABLE MASS · a₂" value={`${format(physics.acceleration2)} m/s²`} note={physics.isBalanced ? "stationary" : physics.acceleration2 > 0 ? "↓ downward" : "↑ upward"} tone="blue" />
            <PulleyMeasurement label="ROPE TENSION" value={`${format(physics.tension)} N`} note="same in every segment" tone="green" />
            <PulleyMeasurement label="UPWARD SUPPORT ON m₂" value={`${format(2 * physics.tension)} N`} note="two segments · 2T" tone="violet" />
            <PulleyMeasurement label="POSITION CONSTRAINT" value={format(residuals.positionConstraint, 5)} note="Δy₁ + 2Δy₂" tone="yellow" />
            <PulleyMeasurement label="TOTAL ENERGY Δ" value={`${format(residuals.mechanicalEnergy, 5)} J`} note="ideal system" tone="teal" />
          </div>
        </section>

        <aside className="control-column">
          <section className="prediction-panel">
            <div className="panel-index">01</div><div className="panel-heading"><span className="eyebrow">PREDICT</span><h2>Which body moves downward?</h2><p>Equal masses do not balance this apparatus.</p></div>
            <div className="prediction-options pulley-predictions">
              <PredictionButton label="m₁ descends" note="Free end moves down" selected={prediction === "m1"} correct={submitted && correctPrediction === "m1"} onClick={() => choosePrediction("m1")} />
              <PredictionButton label="m₂ descends" note="Movable pulley moves down" selected={prediction === "m2"} correct={submitted && correctPrediction === "m2"} onClick={() => choosePrediction("m2")} />
              <PredictionButton label="Balanced" note="Neither body moves" selected={prediction === "balance"} correct={submitted && correctPrediction === "balance"} onClick={() => choosePrediction("balance")} />
            </div>
            {submitted && <div className={`prediction-feedback ${predictionCorrect ? "correct" : "rethink"}`}><strong>{predictionCorrect ? "Correct—now explain the factor of two." : "Recheck how many rope segments support m₂."}</strong><span>The direction test is 2m₁ versus m₂.</span></div>}
          </section>
          <section className="parameter-panel">
            <div className="panel-index">02</div><div className="panel-heading compact"><span className="eyebrow">EXPERIMENT</span><h2>Change the loading</h2></div>
            <PulleyRange label="Free-end mass" symbol="m₁" value={mass1} min={1} max={8} step={0.5} unit="kg" onChange={(v) => { resetMotion(); setFocus("m1"); setMass1(v); }} />
            <PulleyRange label="Movable-pulley mass" symbol="m₂" value={mass2} min={1} max={12} step={0.5} unit="kg" onChange={(v) => { resetMotion(); setFocus("m2"); setMass2(v); }} />
            <PulleyRange label="Gravity" symbol="g" value={gravity} min={1.6} max={12} step={0.1} unit="m/s²" onChange={(v) => { resetMotion(); setFocus("gravity"); setGravity(v); }} />
            <div className="balance-card"><span>BALANCE TARGET</span><strong>m₂ = 2m₁ = {format(2 * mass1, 1)} kg</strong><small>{physics.isBalanced ? "Exact equilibrium reached" : `${format(Math.abs(2 * mass1 - mass2), 1)} kg away`}</small></div>
            <div className="overlay-controls"><span>VISUAL OVERLAYS</span><PulleyToggle label="Force vectors" active={showForces} onClick={() => setShowForces((v) => !v)} /><PulleyToggle label="Velocity vectors" active={showVelocity} onClick={() => setShowVelocity((v) => !v)} /></div>
          </section>
        </aside>
      </div>

      <section className="insight-section pulley-insight">
        <div className="insight-content equation-content">
          <div><span className="eyebrow">THE CONSTRAINT IS THE KEY</span><h2>Geometry first. Dynamics second.</h2><p>Write one coordinate for the free end and one for the moving pulley. Differentiating the fixed-length equation gives the velocity and acceleration relations automatically.</p></div>
          <div className="equation-card"><span>Rope constraint</span><strong>y₁ + 2y₂ = constant</strong></div>
          <div className="equation-card accent"><span>Solved acceleration</span><strong>a₁ = <span className="fraction"><i>2g(2m₁ − m₂)</i><i>4m₁ + m₂</i></span></strong></div>
          <div className="challenge-answer"><span>TRANSFER QUESTION</span><strong>What changes if the lower pulley has its own mass?</strong><small>Add that mass to the moving assembly—then redraw its free-body diagram before touching the constraint.</small></div>
        </div>
      </section>
      <footer><span>DRISHYA · MECHANICS LABS</span><span>Constraint → Forces → Direction → Motion</span><span>Built for questions that resist memorisation.</span></footer>
    </main>
  );
}

function PulleyMeasurement({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <div className={`measurement ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function PredictionButton({ label, note, selected, correct, onClick }: { label: string; note: string; selected: boolean; correct: boolean; onClick: () => void }) {
  return <button className={`${selected ? "selected" : ""} ${selected && !correct ? "wrong" : ""}`} onClick={onClick}><span className="direction-icon">{label.includes("m₁") ? "1" : label.includes("m₂") ? "2" : "="}</span><span><strong>{label}</strong><small>{note}</small></span><i>{selected ? correct ? "✓" : "×" : ""}</i></button>;
}

function PulleyRange({ label, symbol, value, min, max, step, unit, onChange }: { label: string; symbol: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  const percentage = ((value - min) / (max - min)) * 100;
  return <label className="range-control"><span className="range-label"><span><i>{symbol}</i>{label}</span><strong>{format(value, step < 1 ? 1 : 0)} <small>{unit}</small></strong></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} style={{ "--range-fill": `${percentage}%` } as React.CSSProperties} onChange={(event) => onChange(Number(event.target.value))} /><span className="range-bounds"><i>{min}</i><i>{max}</i></span></label>;
}

function PulleyToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={active ? "active" : ""} aria-pressed={active} onClick={onClick}><span>{label}</span><i /></button>;
}
