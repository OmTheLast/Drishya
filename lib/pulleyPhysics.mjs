// @ts-check

/**
 * Ideal fixed + movable pulley system.
 * Positive coordinates point downward for both bodies.
 * The inextensible rope imposes y1 + 2 y2 = constant.
 */

/**
 * @typedef {object} PulleyInputs
 * @property {number} mass1 Free-end mass
 * @property {number} mass2 Mass attached to the movable pulley
 * @property {number} gravity
 * @property {number} [travel]
 */

/** @param {PulleyInputs} inputs */
export function createPulleySystem(inputs) {
  const { mass1: m1, mass2: m2, gravity: g, travel = 2 } = inputs;

  for (const [name, value] of Object.entries({ mass1: m1, mass2: m2, gravity: g, travel })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive finite number`);
    }
  }

  const denominator = 4 * m1 + m2;
  const acceleration1 = (2 * g * (2 * m1 - m2)) / denominator;
  const isBalanced = Math.abs(2 * m1 - m2) < 1e-12;
  const acceleration2 = isBalanced ? 0 : -acceleration1 / 2;
  const tension = (3 * m1 * m2 * g) / denominator;
  const endTime = isBalanced
    ? Number.POSITIVE_INFINITY
    : Math.sqrt((2 * travel) / Math.abs(acceleration1));
  const direction = isBalanced
    ? "balanced"
    : acceleration1 > 0
      ? "mass1-down"
      : "mass2-down";

  return Object.freeze({
    m1,
    m2,
    g,
    travel,
    denominator,
    acceleration1,
    acceleration2,
    tension,
    isBalanced,
    endTime,
    direction,
  });
}

/**
 * @param {ReturnType<typeof createPulleySystem>} system
 * @param {number} requestedTime
 */
export function pulleyStateAt(system, requestedTime) {
  const time = system.isBalanced
    ? 0
    : Math.min(system.endTime, Math.max(0, requestedTime));
  const atBoundary =
    !system.isBalanced && time >= system.endTime - Number.EPSILON;
  const displacement1 = atBoundary
    ? Math.sign(system.acceleration1) * system.travel
    : 0.5 * system.acceleration1 * time * time;
  const displacement2 = -displacement1 / 2;
  const velocity1 = system.acceleration1 * time;
  const velocity2 = system.acceleration2 * time;
  const kineticEnergy =
    0.5 * system.m1 * velocity1 * velocity1 +
    0.5 * system.m2 * velocity2 * velocity2;
  const potentialEnergy =
    -system.m1 * system.g * displacement1 -
    system.m2 * system.g * displacement2;

  return Object.freeze({
    time,
    displacement1,
    displacement2,
    velocity1,
    velocity2,
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
    progress: Math.abs(displacement1) / system.travel,
    atBoundary,
  });
}

/**
 * @param {ReturnType<typeof createPulleySystem>} system
 * @param {ReturnType<typeof pulleyStateAt>} state
 */
export function pulleyResiduals(system, state) {
  return Object.freeze({
    positionConstraint: state.displacement1 + 2 * state.displacement2,
    velocityConstraint: state.velocity1 + 2 * state.velocity2,
    mass1Force:
      system.m1 * system.g - system.tension -
      system.m1 * system.acceleration1,
    mass2Force:
      system.m2 * system.g - 2 * system.tension -
      system.m2 * system.acceleration2,
    mechanicalEnergy: state.totalEnergy,
  });
}
