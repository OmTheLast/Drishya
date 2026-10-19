# Drishya Physics

An interactive mechanics laboratory for building the physical intuition needed
for difficult JEE Main and Advanced problems.

**Live simulation:** [ompatnaik.com/Drishya](https://ompatnaik.com/Drishya/)

The first lab models a block sliding on a freely moving frictionless wedge. A
student predicts the motion, runs the simulation, switches reference frames,
changes physical parameters, inspects vectors, and connects the observed motion
to its equations.

## Run locally

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Every push to `main` builds and deploys the static application to GitHub Pages.
The deployment workflow also runs the physics tests and lint checks before
publishing.

## Validation

```bash
npm test
```

The tests build the application and verify that the analytical model:

- conserves horizontal momentum;
- conserves mechanical energy;
- reaches the geometrically derived wedge endpoint;
- approaches `g sin(theta)` as the wedge mass becomes very large.

## Physics model

The simulation uses a custom closed-form solver in SI units rather than a game
physics engine. For wedge mass `M`, block mass `m`, incline angle `theta`, and
gravity `g`, the block's acceleration relative to the wedge is

```text
s_ddot = (M + m) g sin(theta) / (M + m sin²(theta))
```

and the wedge acceleration is

```text
X_ddot = -m g sin(theta) cos(theta) / (M + m sin²(theta)).
```

The renderer receives world coordinates from this solver and only converts
metres to pixels. The current model ends when the block reaches the wedge foot;
the subsequent impact with the ground is intentionally treated as a separate
contact problem.

## Project structure

```text
app/                    Interface and visualization
lib/wedgePhysics.mjs    Analytical mechanics model
tests/                  Conservation and limiting-case tests
public/                 Static visual assets
```
