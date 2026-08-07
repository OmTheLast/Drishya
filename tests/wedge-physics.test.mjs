import assert from "node:assert/strict";
import test from "node:test";
import {
  conservationResiduals,
  createWedgeSystem,
  stateAt,
} from "../lib/wedgePhysics.mjs";

const parameters = [
  { wedgeMass: 5, blockMass: 2, angleDeg: 30, gravity: 9.8 },
  { wedgeMass: 2, blockMass: 6, angleDeg: 60, gravity: 12 },
  { wedgeMass: 12, blockMass: 0.5, angleDeg: 15, gravity: 1.6 },
];

test("conserves horizontal momentum and mechanical energy", () => {
  for (const inputs of parameters) {
    const system = createWedgeSystem(inputs);
    for (const fraction of [0, 0.2, 0.5, 0.9, 1]) {
      const state = stateAt(system, system.endTime * fraction);
      const residuals = conservationResiduals(system, state);
      assert.ok(Math.abs(residuals.horizontalMomentum) < 1e-10);
      assert.ok(Math.abs(residuals.mechanicalEnergy) < 1e-9);
      assert.ok(Math.abs(residuals.contactNormal) < 1e-12);
    }
  }
});

test("ends exactly when the block reaches the wedge foot", () => {
  const system = createWedgeSystem(parameters[0]);
  const state = stateAt(system, system.endTime * 2);
  assert.equal(state.time, system.endTime);
  assert.equal(state.s, system.endS);
  assert.equal(state.progress, 1);
  assert.equal(state.atFoot, true);
});

test("approaches the fixed-incline result for a heavy wedge", () => {
  const system = createWedgeSystem({
    wedgeMass: 1e12,
    blockMass: 2,
    angleDeg: 37,
    gravity: 9.8,
  });
  const expected = system.g * system.sin;
  assert.ok(Math.abs(system.relativeAcceleration - expected) < 1e-10);
  assert.ok(Math.abs(system.wedgeAcceleration) < 1e-10);
});
