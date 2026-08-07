export interface WedgeInputs {
  wedgeMass: number;
  blockMass: number;
  angleDeg: number;
  gravity: number;
  inclineLength?: number;
  blockSize?: number;
}

export interface WedgeSystem {
  readonly M: number;
  readonly m: number;
  readonly g: number;
  readonly angleDeg: number;
  readonly theta: number;
  readonly sin: number;
  readonly cos: number;
  readonly denominator: number;
  readonly inclineLength: number;
  readonly blockSize: number;
  readonly base: number;
  readonly height: number;
  readonly startS: number;
  readonly endS: number;
  readonly travel: number;
  readonly endTime: number;
  readonly relativeAcceleration: number;
  readonly wedgeAcceleration: number;
  readonly blockAcceleration: Readonly<{ x: number; y: number }>;
  readonly normalForce: number;
}

export interface WedgeState {
  readonly time: number;
  readonly s: number;
  readonly displacement: number;
  readonly progress: number;
  readonly atFoot: boolean;
  readonly wedge: Readonly<{ x: number; vx: number }>;
  readonly block: Readonly<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    relativeSpeed: number;
  }>;
  readonly horizontalMomentum: number;
  readonly kineticEnergy: number;
  readonly potentialEnergy: number;
  readonly totalEnergy: number;
}

export const WEDGE_GEOMETRY: Readonly<{
  inclineLength: number;
  blockSize: number;
}>;

export function createWedgeSystem(inputs: WedgeInputs): WedgeSystem;
export function stateAt(system: WedgeSystem, requestedTime: number): WedgeState;
export function conservationResiduals(
  system: WedgeSystem,
  state: WedgeState,
): Readonly<{
  horizontalMomentum: number;
  mechanicalEnergy: number;
  contactNormal: number;
}>;
