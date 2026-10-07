"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  conservationResiduals,
  createWedgeSystem,
  stateAt,
} from "../lib/wedgePhysics.mjs";

type Prediction = "left" | "right" | null;
type InsightTab = "intuition" | "equations" | "challenge";
type ReferenceFrame = "ground" | "wedge";
type GuideStep = 0 | 1 | 2 | 3;
type ParameterFocus = "start" | "wedge" | "block" | "angle" | "friction" | "gravity";

const SPEEDS = [0.25, 0.5, 1];
const PX_PER_METER = 43;

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
  const [referenceFrame, setReferenceFrame] =
    useState<ReferenceFrame>("ground");
  const [frictionEnabled, setFrictionEnabled] = useState(false);
  const [frictionCoefficient, setFrictionCoefficient] = useState(0.2);
  const [showGuide, setShowGuide] = useState(true);
  const [guideStep, setGuideStep] = useState<GuideStep>(0);
  const [parameterFocus, setParameterFocus] = useState<ParameterFocus>("start");
  const lastFrame = useRef<number | null>(null);
  const timeRef = useRef(0);

  const physics = useMemo(() => {
    return createWedgeSystem({
      wedgeMass,
      blockMass,
      angleDeg: angle,
      gravity,
      frictionCoefficient: frictionEnabled ? frictionCoefficient : 0,
    });
  }, [angle, blockMass, frictionCoefficient, frictionEnabled, gravity, wedgeMass]);

  const world = useMemo(() => stateAt(physics, time), [physics, time]);
  const residuals = useMemo(
    () => conservationResiduals(physics, world),
    [physics, world],
  );
  const ended = world.atFoot;
  const renderedWedgeX = referenceFrame === "ground" ? world.wedge.x : 0;
  const renderedBlockX =
    referenceFrame === "ground"
      ? world.block.x
      : world.block.x - world.wedge.x;
  const blockPixels = physics.blockSize * PX_PER_METER;
  const weightArrow = Math.max(20, blockMass * gravity * 1.45);
  const normalArrow = Math.max(20, physics.normalForce * 1.45);
  const frictionArrow = Math.max(18, physics.frictionForce * 1.45);
  const weightParallel = blockMass * gravity * physics.sin;
  const weightPerpendicular = blockMass * gravity * physics.cos;
  const parallelArrow = Math.max(20, weightParallel * 1.45);
  const perpendicularArrow = Math.max(20, weightPerpendicular * 1.45);
  const maximumFriction = frictionEnabled
    ? frictionCoefficient * physics.normalForce
    : 0;
  const normalDifference = physics.normalForce - weightPerpendicular;
  const netDownPlaneForce = Math.max(0, weightParallel - physics.frictionForce);
  const blockSpeed = Math.hypot(world.block.vx, world.block.vy);
  const initialWorld = useMemo(() => stateAt(physics, 0), [physics]);
  const centreOfMassX =
    (wedgeMass * (world.wedge.x + physics.base / 3) +
      blockMass * world.block.x) /
    (wedgeMass + blockMass);
  const initialCentreOfMassX =
    (wedgeMass * (initialWorld.wedge.x + physics.base / 3) +
      blockMass * initialWorld.block.x) /
    (wedgeMass + blockMass);
  const centreOfMassShift = centreOfMassX - initialCentreOfMassX;
  const adaptiveCue = useMemo(() => {
    switch (parameterFocus) {
      case "wedge":
        return {
          label: "YOU CHANGED THE WEDGE MASS",
          text: `At M = ${format(wedgeMass, 1)} kg, the wedge accelerates ${format(Math.abs(physics.wedgeAcceleration))} m/s² left. A heavier wedge approaches the familiar fixed-incline limit.`,
        };
      case "block":
        return {
          label: "YOU CHANGED THE BLOCK MASS",
          text: `At m = ${format(blockMass, 1)} kg, the two bodies are still coupled: the block changes the reaction on the wedge, so you cannot analyse it as a block on a fixed plane.`,
        };
      case "angle":
        return {
          label: "YOU CHANGED THE INCLINATION",
          text: `At θ = ${angle}°, the downslope pull is ${format(weightParallel, 1)} N and sticking requires μ ≥ tan θ = ${format(physics.staticThreshold, 2)}.`,
        };
      case "friction":
        return {
          label: frictionEnabled ? "FRICTION IS NOW PART OF THE MODEL" : "CONTACT IS NOW SMOOTH",
          text: frictionEnabled
            ? physics.isStatic
              ? `μ = ${format(frictionCoefficient, 2)} is large enough to prevent relative motion. Static friction supplies only ${format(physics.frictionForce, 1)} N—the amount required.`
              : `Friction removes ${format(physics.frictionForce, 1)} N from the downslope drive. Horizontal momentum is still conserved because friction is internal to the chosen system.`
            : "With f = 0, gravity's downslope component is unopposed. Mechanical energy and horizontal momentum are both conserved.",
        };
      case "gravity":
        return {
          label: "YOU CHANGED GRAVITY",
          text: `At g = ${format(gravity, 1)} m/s², every gravitational force and acceleration rescales, but the sticking test μ ≥ tan θ does not change.`,
        };
      default:
        return {
          label: "LIVE TUTOR",
          text: "Change any control. The explanation will update with the numbers and identify the principle that changed—or the invariant that did not.",
        };
    }
  }, [
    angle,
    blockMass,
    frictionCoefficient,
    frictionEnabled,
    gravity,
    parameterFocus,
    physics.frictionForce,
    physics.isStatic,
    physics.staticThreshold,
    physics.wedgeAcceleration,
    wedgeMass,
    weightParallel,
  ]);

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

    let frameId = 0;
    const animate = (now: number) => {
      if (lastFrame.current === null) lastFrame.current = now;
      const delta = Math.min((now - lastFrame.current) / 1000, 0.04);
      lastFrame.current = now;
      const nextTime = Math.min(
        physics.endTime,
        timeRef.current + delta * SPEEDS[speedIndex],
      );
      timeRef.current = nextTime;
      setTime(nextTime);
      if (nextTime >= physics.endTime) {
        setRunning(false);
        return;
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [physics.endTime, running, speedIndex]);

  const choosePrediction = (choice: Exclude<Prediction, null>) => {
    setPrediction(choice);
    setSubmitted(true);
    resetMotion();
  };

  const step = (direction: 1 | -1) => {
    setRunning(false);
    const nextTime = Math.min(
      physics.endTime,
      Math.max(0, timeRef.current + direction * 0.08),
    );
    timeRef.current = nextTime;
    setTime(nextTime);
  };

  const replay = () => {
    if (!submitted || physics.isStatic) return;
    if (ended) {
      timeRef.current = 0;
      setTime(0);
      setRunning(true);
      return;
    }
    setRunning((current) => !current);
  };

  const switchSpeed = () => {
    setSpeedIndex((current) => (current + 1) % SPEEDS.length);
  };

  const trailDots = Array.from({ length: 7 }, (_, index) => {
    const trailTime = Math.max(0, time - (index + 1) * 0.1);
    const trailState = stateAt(physics, trailTime);
    const trailX =
      referenceFrame === "ground"
        ? trailState.block.x
        : trailState.block.x - trailState.wedge.x;
    return {
      x: trailX,
      y: trailState.block.y,
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
              <h1>
                A block. A wedge. {frictionEnabled ? "With friction." : "No friction."}
              </h1>
            </div>
            <p>
              Release the block from rest. The ground exerts no horizontal
              force on the system; friction acts only at the block–wedge contact.
            </p>
          </div>

          <div className="simulation-card">
            <div className="stage-toolbar">
              <div className="status-cluster">
                <span className={`status-dot ${running ? "live" : ""}`} />
                <span>
                  {running
                    ? "SIMULATING"
                    : physics.isStatic
                      ? "STATIC EQUILIBRIUM"
                      : ended
                        ? "AT WEDGE FOOT"
                        : "READY"}
                </span>
                <span className="time-readout">t = {format(world.time)} s</span>
              </div>
              <div className="stage-actions">
                <button
                  className={`guide-toggle ${showGuide ? "active" : ""}`}
                  aria-pressed={showGuide}
                  onClick={() => setShowGuide((value) => !value)}
                >
                  {showGuide ? "GUIDE ON" : "GUIDE OFF"}
                </button>
                <div className="frame-switch">
                  <button
                    className={referenceFrame === "ground" ? "active" : ""}
                    aria-pressed={referenceFrame === "ground"}
                    onClick={() => setReferenceFrame("ground")}
                  >
                    GROUND FRAME
                  </button>
                  <button
                    className={referenceFrame === "wedge" ? "active" : ""}
                    aria-pressed={referenceFrame === "wedge"}
                    onClick={() => setReferenceFrame("wedge")}
                  >
                    WEDGE FRAME
                  </button>
                </div>
              </div>
            </div>

            <div className={`stage ${!submitted ? "stage-locked" : ""}`}>
              <div className="stage-grid" />
              <div
                className="conservation-label"
                title={`Momentum residual: ${residuals.horizontalMomentum.toExponential(2)} kg·m/s; energy residual: ${residuals.mechanicalEnergy.toExponential(2)} J`}
              >
                <i /> P<sub>x</sub> conserved · {physics.isStatic ? "E unchanged" : frictionEnabled ? "E → heat" : "E conserved"}
              </div>
              <div className="inclination-badge">
                <span>INCLINATION</span>
                <strong>θ = {angle}°</strong>
              </div>
              <div className="ground-line">
                <span>FRICTIONLESS GROUND</span>
              </div>

              <div className="world-layer">
                <div
                  className="wedge-shadow"
                  style={{
                    left: `calc(var(--world-origin-x) + ${renderedWedgeX * PX_PER_METER}px)`,
                    top: "calc(var(--ground-y) - 5px)",
                    width: physics.base * PX_PER_METER,
                  }}
                />
                <div
                  className="wedge"
                  style={{
                    left: `calc(var(--world-origin-x) + ${renderedWedgeX * PX_PER_METER}px)`,
                    top: `calc(var(--ground-y) - ${physics.height * PX_PER_METER}px)`,
                    width: physics.base * PX_PER_METER,
                    height: physics.height * PX_PER_METER,
                  }}
                >
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
                        left: `calc(var(--world-origin-x) + ${dot.x * PX_PER_METER}px)`,
                        top: `calc(var(--ground-y) - ${dot.y * PX_PER_METER}px)`,
                        opacity: dot.opacity,
                      }}
                    />
                  ))}

                <div
                  className="block"
                  style={{
                    left: `calc(var(--world-origin-x) + ${renderedBlockX * PX_PER_METER - blockPixels / 2}px)`,
                    top: `calc(var(--ground-y) - ${world.block.y * PX_PER_METER + blockPixels / 2}px)`,
                    width: blockPixels,
                    height: blockPixels,
                    transform: `rotate(${angle}deg)`,
                  }}
                >
                  <span>m</span>
                  <em>{format(blockMass, 1)} kg</em>
                  {showForces && (
                    <>
                      <i
                        className="vector vector-weight"
                        style={{
                          width: weightArrow,
                          transform: `rotate(${90 - angle}deg)`,
                        }}
                      >
                        <b>mg · {format(blockMass * gravity, 1)} N</b>
                      </i>
                      {showGuide && submitted && guideStep === 0 && (
                        <>
                          <i
                            className="vector vector-component vector-component-parallel"
                            style={{ width: parallelArrow }}
                          >
                            <b>mg sin θ · {format(weightParallel, 1)} N</b>
                          </i>
                          <i
                            className="vector vector-component vector-component-perpendicular"
                            style={{
                              width: perpendicularArrow,
                              transform: "rotate(90deg)",
                            }}
                          >
                            <b>mg cos θ · {format(weightPerpendicular, 1)} N</b>
                          </i>
                        </>
                      )}
                      <i
                        className="vector vector-normal"
                        style={{
                          width: normalArrow,
                          transform: "rotate(-90deg)",
                        }}
                      >
                        <b>N · {format(physics.normalForce, 1)} N</b>
                      </i>
                      {frictionEnabled && physics.frictionForce > 0 && (
                        <i
                          className="vector vector-friction"
                          style={{
                            width: frictionArrow,
                            transform: "rotate(180deg)",
                          }}
                        >
                          <b>f · {format(physics.frictionForce, 1)} N</b>
                        </i>
                      )}
                    </>
                  )}
                  {showVelocity && time > 0.04 && (
                    <i
                      className="vector vector-velocity"
                      style={{
                        width: Math.max(
                          22,
                          Math.min(105, world.block.relativeSpeed * 11),
                        ),
                      }}
                    >
                      <b>v<sub>rel</sub></b>
                    </i>
                  )}
                </div>

                <div
                  className="wedge-motion"
                  style={{
                    left: `calc(var(--world-origin-x) + ${renderedWedgeX * PX_PER_METER}px)`,
                    top: "calc(var(--ground-y) + 25px)",
                    opacity: time > 0.05 ? 1 : 0.2,
                  }}
                >
                  <i />
                  <span>a<sub>w</sub></span>
                </div>
              </div>

              {showGuide && submitted && !ended && (
                <div className="coach-overlay" aria-live="polite">
                  <div className="coach-nav" role="tablist" aria-label="Adaptive simulation lesson">
                    {(["RESOLVE", "FRICTION", "MOTION", "SYSTEM"] as const).map(
                      (label, index) => (
                        <button
                          key={label}
                          role="tab"
                          aria-selected={guideStep === index}
                          className={guideStep === index ? "active" : ""}
                          onClick={() => setGuideStep(index as GuideStep)}
                        >
                          <span>0{index + 1}</span>
                          {label}
                        </button>
                      ),
                    )}
                  </div>

                  {guideStep === 0 && (
                    <div className="coach-body">
                      <span className="coach-kicker">01 · RESOLVE WEIGHT, NOT MASS</span>
                      <strong>Choose axes along and perpendicular to the incline.</strong>
                      <p>
                        The mass remains {format(blockMass, 1)} kg. Its weight mg is
                        vertical; the dashed arrows are components of that one
                        force, chosen because contact forces use the same axes.
                      </p>
                      <div className="coach-equation-stack">
                        <span><i className="metric-orange" />Along plane <b>mg sin θ = {format(weightParallel, 1)} N</b></span>
                        <span><i className="metric-violet" />Into plane <b>mg cos θ = {format(weightPerpendicular, 1)} N</b></span>
                        <span><i className="metric-blue" />Contact normal <b>N = {format(physics.normalForce, 1)} N</b></span>
                      </div>
                      <div className="jee-trap">
                        <span>JEE TRAP</span>
                        <p>
                          N is {Math.abs(normalDifference) < 0.05 ? "equal to" : normalDifference > 0 ? "greater than" : "less than"} mg cos θ here
                          {Math.abs(normalDifference) < 0.05
                            ? " because the system is at rest."
                            : ` by ${format(Math.abs(normalDifference), 1)} N because the support itself accelerates.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {guideStep === 1 && (
                    <div className="coach-body">
                      <span className="coach-kicker">02 · DECIDE: STICK OR SLIDE?</span>
                      <strong>
                        {!frictionEnabled
                          ? "Smooth contact means the block must slide."
                          : physics.isStatic
                            ? "Available static friction is sufficient: the system stays at rest."
                            : "Friction reduces the drive, but cannot prevent sliding."}
                      </strong>
                      <p>
                        {!frictionEnabled
                          ? `The ${format(weightParallel, 1)} N downslope component has no opposing tangential contact force.`
                          : physics.isStatic
                            ? `Sticking needs ${format(weightParallel, 1)} N. The contact could supply up to μN = ${format(maximumFriction, 1)} N, so it supplies exactly what is needed—not the maximum.`
                            : `The selected μ gives f = μN = ${format(physics.frictionForce, 1)} N, leaving ${format(netDownPlaneForce, 1)} N of downslope drive.`}
                      </p>
                      <div className="regime-comparison">
                        <span>μ selected <b>{frictionEnabled ? format(frictionCoefficient, 2) : "0.00"}</b></span>
                        <span>μ needed <b>tan θ = {format(physics.staticThreshold, 2)}</b></span>
                        <strong className={physics.isStatic ? "regime-static" : "regime-slide"}>
                          {physics.isStatic ? "STICKS" : "SLIDES"}
                        </strong>
                      </div>
                      <div className="jee-trap">
                        <span>MODEL NOTE</span>
                        <p>This lab uses one μ for the limit test and sliding. In exam problems, check whether μₛ and μₖ are given separately.</p>
                      </div>
                    </div>
                  )}

                  {guideStep === 2 && (
                    <div className="coach-body">
                      <span className="coach-kicker">03 · RELATIVE MOTION ≠ GROUND MOTION</span>
                      <strong>
                        {physics.isStatic
                          ? "Every velocity and acceleration is zero."
                          : referenceFrame === "ground"
                            ? "You are viewing the block from the ground."
                            : "You are riding with the accelerating wedge."}
                      </strong>
                      <p>
                        {physics.isStatic
                          ? "Static friction prevents relative motion, so the wedge has no reason to recoil."
                          : referenceFrame === "ground"
                            ? `The block slides down-right relative to the wedge while the wedge moves left. Combining both gives aₓ = ${format(physics.blockAcceleration.x)} and aᵧ = ${format(physics.blockAcceleration.y)} m/s².`
                            : `In this non-inertial frame the wedge is fixed, but a pseudo-force must be included. The relative acceleration is ${format(physics.relativeAcceleration)} m/s² down the plane.`}
                      </p>
                      <div className="coach-metrics kinematics-grid">
                        <span>a<sub>rel</sub><b>{format(physics.relativeAcceleration)} m/s²</b></span>
                        <span>a<sub>x,ground</sub><b>{format(physics.blockAcceleration.x)} m/s²</b></span>
                        <span>a<sub>y,ground</sub><b>{format(physics.blockAcceleration.y)} m/s²</b></span>
                        <span>|v<sub>ground</sub>|<b>{format(blockSpeed)} m/s</b></span>
                      </div>
                      <div className="jee-trap"><span>JEE TRAP</span><p>“Down the plane” describes relative motion. It does not give the block&apos;s ground-frame acceleration direction.</p></div>
                    </div>
                  )}

                  {guideStep === 3 && (
                    <div className="coach-body">
                      <span className="coach-kicker">04 · ZOOM OUT TO THE SYSTEM</span>
                      <strong>
                        {physics.isStatic
                          ? "Nothing moves, but the conservation laws still hold."
                          : "Internal forces exchange momentum; they cannot move the horizontal COM."}
                      </strong>
                      <p>
                        The smooth ground supplies no horizontal external force.
                        Therefore total pₓ remains zero and the horizontal centre
                        of mass stays fixed, even while both bodies move.
                      </p>
                      <div className="coach-metrics system-metrics">
                        <span>p<sub>x,total</sub><b>{format(world.horizontalMomentum, 5)} kg·m/s</b></span>
                        <span>Δx<sub>COM</sub><b>{format(centreOfMassShift, 5)} m</b></span>
                        <span>Energy story<b>{frictionEnabled && !physics.isStatic ? `${format(world.dissipatedEnergy, 2)} J → heat` : "mechanical E unchanged"}</b></span>
                      </div>
                      <div className="jee-trap"><span>JEE TRAP</span><p>Friction is internal for block + wedge. It can dissipate mechanical energy without violating horizontal momentum conservation.</p></div>
                    </div>
                  )}

                  <div className="adaptive-cue">
                    <span>{adaptiveCue.label}</span>
                    <p>{adaptiveCue.text}</p>
                  </div>
                </div>
              )}

              {physics.isStatic && submitted && !showGuide && (
                <div className="event-marker static-marker" role="status">
                  <span>STATIC FRICTION HOLDS</span>
                  <strong>μ = {format(physics.frictionCoefficient, 2)} ≥ tan θ = {format(physics.staticThreshold, 2)}</strong>
                  <small>
                    The required friction is available, so neither the block nor
                    the wedge accelerates. Lower μ or increase θ to release it.
                  </small>
                </div>
              )}

              {ended && submitted && (
                <div className="event-marker" role="status">
                  <span>DOMAIN BOUNDARY</span>
                  <strong>Block reached the wedge foot at {format(physics.endTime)} s</strong>
                  <small>
                    Replay, step backward, or change a parameter. Ground impact is
                    a separate contact event and is not assumed here.
                  </small>
                </div>
              )}

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
                  disabled={!submitted || physics.isStatic || time === 0}
                >
                  −▮
                </button>
                <button
                  className="play-button"
                  aria-label={running ? "Pause simulation" : "Play simulation"}
                  onClick={replay}
                  disabled={!submitted || physics.isStatic}
                >
                  {running ? "Ⅱ" : "▶"}
                </button>
                <button
                  aria-label="Step forward"
                  onClick={() => step(1)}
                  disabled={!submitted || physics.isStatic || ended}
                >
                  ▮+
                </button>
                <button className="reset-button" onClick={resetMotion}>
                  ↺ RESET
                </button>
              </div>

              <div className="timeline">
                <div className="timeline-track">
                  <i style={{ width: `${world.progress * 100}%` }} />
                </div>
              </div>

              <button className="speed-button" onClick={switchSpeed}>
                {SPEEDS[speedIndex]}× SPEED
              </button>
            </div>
          </div>

          <div className="measurement-strip">
            <Measurement
              label="WEDGE · aₓ"
              value={`${format(Math.abs(physics.wedgeAcceleration))} m/s²`}
              note={physics.isStatic ? "stationary" : "← left"}
              tone="orange"
            />
            <Measurement
              label="BLOCK · aₓ (GROUND)"
              value={`${format(physics.blockAcceleration.x)} m/s²`}
              note={physics.isStatic ? "static" : "→ right"}
              tone="blue"
            />
            <Measurement
              label="BLOCK · aᵧ (GROUND)"
              value={`${format(physics.blockAcceleration.y)} m/s²`}
              note={physics.isStatic ? "static" : "↓ downward"}
              tone="green"
            />
            <Measurement
              label="BLOCK · |v| (GROUND)"
              value={`${format(blockSpeed)} m/s`}
              note={
                ended
                  ? "at wedge foot"
                  : time === 0
                    ? "at release"
                    : `at ${format(time)} s`
              }
              tone="violet"
            />
            <Measurement
              label="BLOCK · a RELATIVE"
              value={`${format(physics.relativeAcceleration)} m/s²`}
              note={physics.isStatic ? "friction holds" : "down the plane"}
              tone="yellow"
            />
            <Measurement
              label="CENTRE OF MASS · Δx"
              value={`${format(centreOfMassShift, 5)} m`}
              note="no horizontal drift"
              tone="teal"
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
                  physics.isStatic
                    ? "static"
                    : prediction === "left"
                      ? "correct"
                      : "rethink"
                }`}
              >
                <strong>
                  {physics.isStatic
                    ? "Static friction changes the outcome."
                    : prediction === "left"
                      ? "Correct — now prove it."
                      : "Good hypothesis — watch the centre of mass."}
                </strong>
                <span>
                  {physics.isStatic
                    ? "At this μ, friction balances gravity along the incline, so neither body accelerates."
                    : "With no external horizontal force, the system's horizontal centre of mass cannot accelerate."}
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
              onChange={(value) => {
                resetMotion();
                setParameterFocus("wedge");
                setWedgeMass(value);
              }}
            />
            <RangeControl
              label="Block mass"
              symbol="m"
              value={blockMass}
              min={0.5}
              max={6}
              step={0.5}
              unit="kg"
              onChange={(value) => {
                resetMotion();
                setParameterFocus("block");
                setBlockMass(value);
              }}
            />
            <RangeControl
              label="Inclination angle"
              symbol="θ"
              value={angle}
              min={15}
              max={60}
              step={1}
              unit="°"
              onChange={(value) => {
                resetMotion();
                setParameterFocus("angle");
                setAngle(value);
              }}
            />
            <div className="friction-module">
              <button
                className={`friction-button ${frictionEnabled ? "active" : ""}`}
                type="button"
                aria-pressed={frictionEnabled}
                onClick={() => {
                  resetMotion();
                  setParameterFocus("friction");
                  setFrictionEnabled((value) => !value);
                }}
              >
                <span className="friction-symbol">μ</span>
                <span>
                  <strong>FRICTION {frictionEnabled ? "ON" : "OFF"}</strong>
                  <small>
                    {frictionEnabled
                      ? physics.isStatic
                        ? "Static friction holds the block"
                        : "Kinetic friction opposes sliding"
                      : "Ideal smooth contact"}
                  </small>
                </span>
                <i>{frictionEnabled ? "ON" : "OFF"}</i>
              </button>
              {frictionEnabled && (
                <RangeControl
                  label="Friction coefficient"
                  symbol="μ"
                  value={frictionCoefficient}
                  min={0.05}
                  max={0.8}
                  step={0.05}
                  unit=""
                  onChange={(value) => {
                    resetMotion();
                    setParameterFocus("friction");
                    setFrictionCoefficient(value);
                  }}
                />
              )}
            </div>
            <RangeControl
              label="Gravity"
              symbol="g"
              value={gravity}
              min={1.6}
              max={12}
              step={0.1}
              unit="m/s²"
              onChange={(value) => {
                resetMotion();
                setParameterFocus("gravity");
                setGravity(value);
              }}
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
              {physics.isStatic
                ? "Static friction balances the component of gravity along the plane. No momentum develops, and the horizontal centre of mass remains exactly where it began."
                : "The block gains momentum to the right. Because the ground cannot provide a horizontal impulse, the wedge must gain exactly the opposite momentum. The two motions are not separate stories—they are one constraint."}
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
              <span>
                {frictionEnabled
                  ? "Acceleration with friction"
                  : "Acceleration down the wedge"}
              </span>
              {frictionEnabled ? (
                <strong>
                  s̈ ={" "}
                  <span className="fraction">
                    <i>(M + m)(g sin θ − f/m)</i>
                    <i>M + m sin² θ</i>
                  </span>
                </strong>
              ) : (
                <strong>
                  s̈ ={" "}
                  <span className="fraction">
                    <i>(M + m)g sin θ</i>
                    <i>M + m sin² θ</i>
                  </span>
                </strong>
              )}
            </div>
            <p>
              {frictionEnabled
                ? physics.isStatic
                  ? "Because μ ≥ tan θ, static friction can balance mg sin θ. Both accelerations are zero."
                  : "For sliding contact, f = μN removes mechanical energy while horizontal momentum remains conserved."
                : "Substitute the second equation into the first: Ẍ is negative, so the wedge accelerates left."}
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
