export interface PulleyInputs {
  mass1: number;
  mass2: number;
  gravity: number;
  travel?: number;
}

export interface PulleySystem {
  readonly m1: number;
  readonly m2: number;
  readonly g: number;
  readonly travel: number;
  readonly denominator: number;
  readonly acceleration1: number;
  readonly acceleration2: number;
  readonly tension: number;
  readonly isBalanced: boolean;
  readonly endTime: number;
  readonly direction: "balanced" | "mass1-down" | "mass2-down";
}

export interface PulleyState {
  readonly time: number;
  readonly displacement1: number;
  readonly displacement2: number;
  readonly velocity1: number;
  readonly velocity2: number;
  readonly kineticEnergy: number;
  readonly potentialEnergy: number;
  readonly totalEnergy: number;
  readonly progress: number;
  readonly atBoundary: boolean;
}

export function createPulleySystem(inputs: PulleyInputs): PulleySystem;
export function pulleyStateAt(system: PulleySystem, requestedTime: number): PulleyState;
export function pulleyResiduals(
  system: PulleySystem,
  state: PulleyState,
): Readonly<{
  positionConstraint: number;
  velocityConstraint: number;
  mass1Force: number;
  mass2Force: number;
  mechanicalEnergy: number;
}>;
