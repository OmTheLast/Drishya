// @ts-check

/**
 * Analytical solution for a block sliding on a freely moving wedge.
 * Coordinates use SI units: metres, kilograms and seconds.
 * +x points right; +y points upward; s runs down the incline.
 */

export const WEDGE_GEOMETRY = Object.freeze({
  inclineLength: 7,
  blockSize: 0.9,
});

/**
 * @typedef {object} WedgeInputs
 * @property {number} wedgeMass
 * @property {number} blockMass
 * @property {number} angleDeg
 * @property {number} gravity
 * @property {number} [inclineLength]
 * @property {number} [blockSize]
 */

/** @param {WedgeInputs} inputs */
export function createWedgeSystem(inputs) {
  const {
    wedgeMass: M,
    blockMass: m,
    angleDeg,
    gravity: g,
    inclineLength = WEDGE_GEOMETRY.inclineLength,
    blockSize = WEDGE_GEOMETRY.blockSize,
  } = inputs;

  for (const [name, value] of Object.entries({
    wedgeMass: M,
    blockMass: m,
    gravity: g,
    inclineLength,
    blockSize,
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive finite number`);
    }
  }
  if (!Number.isFinite(angleDeg) || angleDeg <= 0 || angleDeg >= 90) {
    throw new RangeError("angleDeg must lie between 0 and 90 degrees");
  }
  if (blockSize >= inclineLength) {
    throw new RangeError("blockSize must be smaller than inclineLength");
  }

  const theta = (angleDeg * Math.PI) / 180;
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const denominator = M + m * sin * sin;
  const relativeAcceleration = (g * sin * (M + m)) / denominator;
  const wedgeAcceleration = (-m * g * sin * cos) / denominator;
  const blockAcceleration = {
    x: (M * g * sin * cos) / denominator,
    y: (-g * (M + m) * sin * sin) / denominator,
  };
  const normalForce = (m * g * M * cos) / denominator;
  const base = inclineLength * cos;
  const height = inclineLength * sin;
  const startS = blockSize / 2;
  const endS = inclineLength - blockSize / 2;
  const travel = endS - startS;
  const endTime = Math.sqrt((2 * travel) / relativeAcceleration);

  return Object.freeze({
    M,
    m,
    g,
    angleDeg,
    theta,
    sin,
    cos,
    denominator,
    inclineLength,
    blockSize,
    base,
    height,
    startS,
    endS,
    travel,
    endTime,
    relativeAcceleration,
    wedgeAcceleration,
    blockAcceleration,
    normalForce,
  });
}

/**
 * Evaluate the exact closed-form state while the block remains on the wedge.
 * Time is clamped at the physical domain boundary: the wedge foot.
 * @param {ReturnType<typeof createWedgeSystem>} system
 * @param {number} requestedTime
 */
export function stateAt(system, requestedTime) {
  const time = Math.min(system.endTime, Math.max(0, requestedTime));
  const atFoot = time >= system.endTime - Number.EPSILON;
  const displacement = atFoot
    ? system.travel
    : 0.5 * system.relativeAcceleration * time * time;
  const s = atFoot ? system.endS : system.startS + displacement;
  const relativeSpeed = system.relativeAcceleration * time;
  const wedgeX = 0.5 * system.wedgeAcceleration * time * time;
  const wedgeVx = system.wedgeAcceleration * time;
  const half = system.blockSize / 2;

  const rampX = s * system.cos;
  const rampY = system.height - s * system.sin;
  const blockX = wedgeX + rampX + half * system.sin;
  const blockY = rampY + half * system.cos;
  const blockVx = wedgeVx + relativeSpeed * system.cos;
  const blockVy = -relativeSpeed * system.sin;
  const horizontalMomentum =
    system.M * wedgeVx + system.m * blockVx;
  const kineticEnergy =
    0.5 * system.M * wedgeVx * wedgeVx +
    0.5 * system.m * (blockVx * blockVx + blockVy * blockVy);
  const potentialEnergy = system.m * system.g * blockY;

  return Object.freeze({
    time,
    s,
    displacement,
    progress: displacement / system.travel,
    atFoot,
    wedge: Object.freeze({ x: wedgeX, vx: wedgeVx }),
    block: Object.freeze({
      x: blockX,
      y: blockY,
      vx: blockVx,
      vy: blockVy,
      relativeSpeed,
    }),
    horizontalMomentum,
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
  });
}

/**
 * Numerical residuals used by tests and the lab's live integrity indicator.
 * @param {ReturnType<typeof createWedgeSystem>} system
 * @param {ReturnType<typeof stateAt>} state
 */
export function conservationResiduals(system, state) {
  const initial = stateAt(system, 0);
  return Object.freeze({
    horizontalMomentum: state.horizontalMomentum,
    mechanicalEnergy: state.totalEnergy - initial.totalEnergy,
    contactNormal: system.normalForce -
      (system.m * system.g * system.M * system.cos) / system.denominator,
  });
}
