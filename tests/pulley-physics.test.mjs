import assert from "node:assert/strict";
import test from "node:test";
import {
  createPulleySystem,
  pulleyResiduals,
  pulleyStateAt,
} from "../lib/pulleyPhysics.mjs";

test("enforces the movable-pulley constraint and both force equations", () => {
  for (const inputs of [
    { mass1: 3, mass2: 4, gravity: 9.8 },
    { mass1: 2, mass2: 7, gravity: 9.8 },
    { mass1: 5.5, mass2: 3, gravity: 1.6 },
  ]) {
    const system = createPulleySystem(inputs);
    for (const fraction of [0, 0.25, 0.6, 1]) {
      const state = pulleyStateAt(system, system.endTime * fraction);
      const residuals = pulleyResiduals(system, state);
      assert.ok(Math.abs(residuals.positionConstraint) < 1e-12);
      assert.ok(Math.abs(residuals.velocityConstraint) < 1e-12);
      assert.ok(Math.abs(residuals.mass1Force) < 1e-12);
      assert.ok(Math.abs(residuals.mass2Force) < 1e-12);
      assert.ok(Math.abs(residuals.mechanicalEnergy) < 1e-9);
    }
  }
});

test("balances when the movable-pulley mass equals twice the free mass", () => {
  const system = createPulleySystem({ mass1: 3, mass2: 6, gravity: 9.8 });
  const state = pulleyStateAt(system, 20);
  assert.equal(system.direction, "balanced");
  assert.equal(system.acceleration1, 0);
  assert.equal(system.acceleration2, 0);
  assert.equal(system.tension, system.m1 * system.g);
  assert.equal(state.time, 0);
});

test("the movable pulley travels half as far in the opposite direction", () => {
  const system = createPulleySystem({ mass1: 3, mass2: 4, gravity: 9.8 });
  const state = pulleyStateAt(system, system.endTime);
  assert.equal(state.displacement1, system.travel);
  assert.equal(state.displacement2, -system.travel / 2);
  assert.equal(state.progress, 1);
  assert.equal(state.atBoundary, true);
});
