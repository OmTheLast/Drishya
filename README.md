<h1 align="center">Drishya Physics</h1>

[Portfolio case study](https://ompatnaik.com/projects/drishya/) · [Live mechanics lab](https://ompatnaik.com/Drishya/)

**Change a mechanics experiment, compare reference frames, and connect the motion to its equations.**

[Demo or published artifacts](https://ompatnaik.com/Drishya/)

Static browser app. Node.js 20.9+ for development. Analytical solvers in SI units.

By Om Patnaik · repository created August 2026.

## Install

| Platform / path | Start here |
| --- | --- |
| Browser | [Open the mechanics lab](https://ompatnaik.com/Drishya/) |
| From source | `npm install`, then `npm run dev` |

Open http://localhost:3000, choose a lab, and predict the motion before running it. Try the hosted simulation without installing anything.

```bash
npm run dev
```

## Why

You know a formula but cannot yet picture the coupled motion it describes. Drishya makes parameters, vectors, frames, and equations visible in an interactive lab. The wedge model stops at the foot of the incline; the ground impact is a separate problem.

## Inspect a moving wedge

Change the block mass, wedge mass, angle, and gravity. Compare world and wedge coordinates while the renderer follows the analytical model.

## Check the equations

The solvers live in `lib/wedgePhysics.mjs` and `lib/pulleyPhysics.mjs`, independently of the interface. Inspect their assumptions alongside the tests.

## Notes from building it

I kept the mechanics separate from the renderer so visual changes cannot redefine the equations. Conservation laws and limiting cases provide checks that an animation alone cannot. I would add separate contact models before extending the wedge experiment past its endpoint.

## Commands

```bash
npm run dev                     # start the lab
npm test                        # build and run mechanics tests
npm run lint                    # check source style
npm run build                   # create the static export
```

## Verify it yourself

```bash
npm test
npm run lint
```

The tests exercise conservation laws, geometry, and limiting cases for the wedge and pulley solvers. They do not replace a browser interaction check; the earlier README records the original wedge checks.

## Credits, license and pointers

Built with Next.js and React; mechanics are implemented in the repository. No source license file is present.

[Full setup, original notes, and project history](README-DETAILS.md).
