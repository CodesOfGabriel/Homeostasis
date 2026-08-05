import { describe, expect, it } from 'vitest';
import { initializePhysiologyForPhenotype } from './simulationStore';

describe('fenótipos de prestígio', () => {
  it('inicia reservas coerentes sem transportar vantagens entre organismos', () => {
    const standard = initializePhysiologyForPhenotype('standard');
    const athlete = initializePhysiologyForPhenotype('athlete');
    const older = initializePhysiologyForPhenotype('older-adult');
    const diabetes = initializePhysiologyForPhenotype('type2-diabetes');
    const kidney = initializePhysiologyForPhenotype('chronic-kidney');

    expect(athlete.energy.vo2Max).toBeGreaterThan(standard.energy.vo2Max);
    expect(athlete.cardiovascular.heartRate).toBeLessThan(standard.cardiovascular.heartRate);
    expect(older.capacities.renalFunction).toBeLessThan(standard.capacities.renalFunction);
    expect(diabetes.pathophysiology.preset).toBe('type2-diabetes');
    expect(kidney.pathophysiology.preset).toBe('renal-failure');
  });
});
