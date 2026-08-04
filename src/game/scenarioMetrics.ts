import type { CellularState } from './cellularTypes';
import type { PhysiologyState } from './types';

export type ScenarioMetricGroup = 'system' | 'endocrine' | 'tissue' | 'cell' | 'mitochondria' | 'pools';
export type ScenarioMetricStep = 'vitals' | 'tissue' | 'defense' | 'mitochondria';

interface ScenarioMetricDefinitionShape {
    key: string;
    label: string;
    unit: string;
    digits: number;
    group: ScenarioMetricGroup;
    step: ScenarioMetricStep;
    read: (physiology: PhysiologyState, cellular: CellularState) => number;
}

/**
 * Catálogo único dos marcadores numéricos mostrados nas quatro escalas do app.
 * Eventos difíceis expõem este catálogo inteiro, evitando que a decisão seja
 * baseada em um recorte conveniente e desconectado do restante do modelo.
 */
export const SCENARIO_METRICS = [
    { key: 'systemicAtpReserve', label: 'Reserva ATP sistêmica', unit: '%', digits: 0, group: 'system', step: 'vitals', read: (p) => p.energy.atpPool / p.energy.maxATP * 100 },
    { key: 'heartRate', label: 'Frequência cardíaca', unit: 'bpm', digits: 0, group: 'system', step: 'vitals', read: (p) => p.cardiovascular.heartRate },
    { key: 'heartRateVariability', label: 'Variabilidade da FC', unit: 'ms', digits: 0, group: 'system', step: 'vitals', read: (p) => p.cardiovascular.heartRateVariability },
    { key: 'systolicBP', label: 'Pressão sistólica', unit: 'mmHg', digits: 0, group: 'system', step: 'vitals', read: (p) => p.cardiovascular.systolicBP },
    { key: 'diastolicBP', label: 'Pressão diastólica', unit: 'mmHg', digits: 0, group: 'system', step: 'vitals', read: (p) => p.cardiovascular.diastolicBP },
    { key: 'meanArterialPressure', label: 'Pressão arterial média', unit: 'mmHg', digits: 0, group: 'system', step: 'vitals', read: (p) => p.cardiovascular.meanArterialPressure },
    { key: 'cardiacOutput', label: 'Débito cardíaco', unit: 'L/min', digits: 1, group: 'system', step: 'vitals', read: (p) => p.cardiovascular.cardiacOutput },
    { key: 'perfusionIndex', label: 'Índice de perfusão', unit: '%', digits: 0, group: 'system', step: 'vitals', read: (p) => p.cardiovascular.perfusionIndex },
    { key: 'spo2', label: 'Saturação periférica de O₂', unit: '%', digits: 1, group: 'system', step: 'vitals', read: (p) => p.respiratory.spo2 },
    { key: 'respiratoryRate', label: 'Frequência respiratória', unit: '/min', digits: 1, group: 'system', step: 'vitals', read: (p) => p.respiratory.respiratoryRate },
    { key: 'pao2', label: 'PaO₂', unit: 'mmHg', digits: 0, group: 'system', step: 'vitals', read: (p) => p.respiratory.pao2 },
    { key: 'paco2', label: 'PaCO₂', unit: 'mmHg', digits: 0, group: 'system', step: 'vitals', read: (p) => p.respiratory.paco2 },
    { key: 'arterialPH', label: 'pH arterial', unit: '', digits: 2, group: 'system', step: 'vitals', read: (p) => p.acidBase.pH },
    { key: 'bicarbonate', label: 'Bicarbonato', unit: 'mmol/L', digits: 1, group: 'system', step: 'vitals', read: (p) => p.acidBase.bicarbonate },
    { key: 'baseExcess', label: 'Excesso de base', unit: 'mmol/L', digits: 1, group: 'system', step: 'vitals', read: (p) => p.acidBase.baseExcess },
    { key: 'anionGap', label: 'Ânion gap', unit: 'mmol/L', digits: 0, group: 'system', step: 'vitals', read: (p) => p.acidBase.anionGap },
    { key: 'bloodLactate', label: 'Lactato sanguíneo', unit: 'mmol/L', digits: 1, group: 'system', step: 'vitals', read: (p) => p.energy.lactateLevel },
    { key: 'bloodGlucose', label: 'Glicose sanguínea', unit: 'mg/dL', digits: 0, group: 'system', step: 'vitals', read: (p) => p.nutrients.bloodGlucose },
    { key: 'plasmaSodium', label: 'Sódio plasmático', unit: 'mmol/L', digits: 1, group: 'system', step: 'vitals', read: (p) => p.nutrients.sodium },
    { key: 'plasmaPotassium', label: 'Potássio plasmático', unit: 'mmol/L', digits: 1, group: 'system', step: 'vitals', read: (p) => p.nutrients.potassium },
    { key: 'hydration', label: 'Água corporal total', unit: 'L', digits: 1, group: 'system', step: 'vitals', read: (p) => p.nutrients.hydration },
    { key: 'ketones', label: 'Corpos cetônicos', unit: 'mmol/L', digits: 1, group: 'system', step: 'vitals', read: (p) => p.nutrients.ketones },
    { key: 'energyDeficit', label: 'Déficit energético', unit: 'mmol', digits: 1, group: 'system', step: 'vitals', read: (p) => p.energy.energyDeficit },
    { key: 'gfr', label: 'Filtração glomerular', unit: 'mL/min', digits: 0, group: 'system', step: 'vitals', read: (p) => p.renal.gfr },
    { key: 'adhActivity', label: 'Atividade de ADH', unit: '%', digits: 0, group: 'system', step: 'vitals', read: (p) => p.renal.adhActivity },
    { key: 'temperature', label: 'Temperatura central', unit: '°C', digits: 1, group: 'system', step: 'vitals', read: (p) => p.bodyTemperature },
    { key: 'inflammation', label: 'Inflamação sistêmica', unit: '%', digits: 0, group: 'system', step: 'vitals', read: (p) => p.allostaticLoad.inflammationLevel },
    { key: 'infection', label: 'Carga infecciosa', unit: '%', digits: 0, group: 'system', step: 'vitals', read: (p) => p.pathophysiology.infectionSeverity },
    { key: 'allostaticLoad', label: 'Carga alostática', unit: '%', digits: 0, group: 'system', step: 'vitals', read: (p) => p.allostaticLoad.currentLoad },

    { key: 'insulin', label: 'Insulina', unit: 'μIU/mL', digits: 1, group: 'endocrine', step: 'vitals', read: (p) => p.hormones.insulin },
    { key: 'growthHormone', label: 'Hormônio do crescimento', unit: 'ng/mL', digits: 1, group: 'endocrine', step: 'vitals', read: (p) => p.hormones.gh },
    { key: 'testosterone', label: 'Testosterona', unit: 'ng/dL', digits: 1, group: 'endocrine', step: 'vitals', read: (p) => p.hormones.testosterone },
    { key: 'glucagon', label: 'Glucagon', unit: 'pg/mL', digits: 1, group: 'endocrine', step: 'vitals', read: (p) => p.hormones.glucagon },
    { key: 'adrenaline', label: 'Adrenalina', unit: 'pg/mL', digits: 1, group: 'endocrine', step: 'vitals', read: (p) => p.hormones.adrenaline },
    { key: 'cortisol', label: 'Cortisol', unit: 'μg/dL', digits: 1, group: 'endocrine', step: 'vitals', read: (p) => p.hormones.cortisol },
    { key: 't3', label: 'Triiodotironina (T3)', unit: 'ng/dL', digits: 1, group: 'endocrine', step: 'vitals', read: (p) => p.hormones.t3 },
    { key: 'mtorActivity', label: 'Atividade mTOR', unit: '%', digits: 0, group: 'endocrine', step: 'defense', read: (p) => p.hormones.mTORActivity },

    { key: 'tissuePerfusion', label: 'Perfusão tecidual', unit: '%', digits: 0, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.perfusionPercent },
    { key: 'tissueOxygen', label: 'PO₂ tecidual', unit: 'mmHg', digits: 0, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.oxygenMmHg },
    { key: 'tissueCarbonDioxide', label: 'PCO₂ tecidual', unit: 'mmHg', digits: 0, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.carbonDioxideMmHg },
    { key: 'tissueGlucose', label: 'Glicose tecidual', unit: 'mmol/L', digits: 1, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.glucoseMmolL },
    { key: 'tissueLactate', label: 'Lactato tecidual', unit: 'mmol/L', digits: 1, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.lactateMmolL },
    { key: 'tissuePH', label: 'pH tecidual', unit: '', digits: 2, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.pH },
    { key: 'tissueOsmolarity', label: 'Osmolaridade tecidual', unit: 'mOsm/kg', digits: 0, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.osmolarity },
    { key: 'tissueSodium', label: 'Na⁺ tecidual', unit: 'mmol/L', digits: 1, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.sodium },
    { key: 'tissuePotassium', label: 'K⁺ tecidual', unit: 'mmol/L', digits: 1, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.potassium },
    { key: 'tissueWaste', label: 'Resíduos teciduais', unit: '%', digits: 0, group: 'tissue', step: 'tissue', read: (_p, c) => c.tissue.wasteLoad },

    { key: 'viability', label: 'Viabilidade celular', unit: '%', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.cell.viabilityPercent },
    { key: 'cellPH', label: 'pH intracelular', unit: '', digits: 2, group: 'cell', step: 'defense', read: (_p, c) => c.cell.pH },
    { key: 'cellVolume', label: 'Volume celular', unit: '%', digits: 1, group: 'cell', step: 'defense', read: (_p, c) => c.cell.volumePercent },
    { key: 'cellMembranePotential', label: 'Potencial de membrana celular', unit: 'mV', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.cell.membranePotentialMv },
    { key: 'cellularAtp', label: 'ATP celular', unit: 'mmol/L', digits: 2, group: 'cell', step: 'defense', read: (_p, c) => c.cell.atpMmolL },
    { key: 'cellularAdp', label: 'ADP celular', unit: 'mmol/L', digits: 2, group: 'cell', step: 'defense', read: (_p, c) => c.cell.adpMmolL },
    { key: 'cellSodium', label: 'Na⁺ intracelular', unit: 'mmol/L', digits: 1, group: 'cell', step: 'defense', read: (_p, c) => c.cell.sodium },
    { key: 'cellPotassium', label: 'K⁺ intracelular', unit: 'mmol/L', digits: 1, group: 'cell', step: 'defense', read: (_p, c) => c.cell.potassium },
    { key: 'cellCalcium', label: 'Ca²⁺ intracelular', unit: 'nM', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.cell.calciumNm },
    { key: 'cellOsmolarity', label: 'Osmolaridade celular', unit: 'mOsm/kg', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.cell.osmolarity },
    { key: 'nadh', label: 'NADH disponível', unit: '%', digits: 0, group: 'cell', step: 'mitochondria', read: (_p, c) => c.cell.nadhPercent },
    { key: 'antioxidants', label: 'Reserva antioxidante', unit: '%', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.damage.antioxidantCapacity },
    { key: 'ros', label: 'ROS / estresse oxidativo', unit: '%', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.damage.oxidativeStress },
    { key: 'membraneDamage', label: 'Dano de membrana', unit: '%', digits: 1, group: 'cell', step: 'defense', read: (_p, c) => c.damage.membrane },
    { key: 'proteinDamage', label: 'Dano proteico', unit: '%', digits: 1, group: 'cell', step: 'defense', read: (_p, c) => c.damage.proteins },
    { key: 'dnaDamage', label: 'Dano ao DNA', unit: '%', digits: 1, group: 'cell', step: 'defense', read: (_p, c) => c.damage.dna },
    { key: 'apoptoticCommitment', label: 'Compromisso apoptótico', unit: '%', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.fate.apoptoticCommitment },
    { key: 'infectionSusceptibility', label: 'Suscetibilidade à infecção', unit: '%', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.fate.infectionSusceptibility },
    { key: 'enzymaticEfficiency', label: 'Adaptação enzimática', unit: 'nível', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.adaptations.enzymaticEfficiency },
    { key: 'antioxidantDefense', label: 'Adaptação antioxidante', unit: 'nível', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.adaptations.antioxidantDefense },
    { key: 'metabolicFlexibility', label: 'Flexibilidade metabólica', unit: 'nível', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.adaptations.metabolicFlexibility },
    { key: 'bufferCapacity', label: 'Capacidade tampão adaptativa', unit: 'nível', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.adaptations.bufferCapacity },
    { key: 'hypoxiaTolerance', label: 'Tolerância adaptativa à hipóxia', unit: 'nível', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.adaptations.hypoxiaTolerance },
    { key: 'transporterAutomation', label: 'Automação de transportadores', unit: 'nível', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.automation.transporters },
    { key: 'mitochondrialAutomation', label: 'Automação da navette', unit: 'nível', digits: 0, group: 'cell', step: 'mitochondria', read: (_p, c) => c.automation.mitochondrialShuttle },
    { key: 'repairAutomation', label: 'Automação de reparo', unit: 'nível', digits: 0, group: 'cell', step: 'defense', read: (_p, c) => c.automation.repair },

    { key: 'mitochondrialPotential', label: 'ΔΨ mitocondrial', unit: 'mV', digits: 0, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.membranePotentialMv },
    { key: 'etcFlux', label: 'Fluxo ETC', unit: '%', digits: 0, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.etcFluxPercent },
    { key: 'atpSynthaseFlux', label: 'Fluxo ATP sintase', unit: '%', digits: 0, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.atpSynthaseFlux },
    { key: 'mitochondrialOxygenConsumption', label: 'Consumo mitocondrial de O₂', unit: '/min', digits: 1, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.oxygenConsumption },
    { key: 'mitochondrialHealth', label: 'Saúde mitocondrial', unit: '%', digits: 0, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.healthPercent },
    { key: 'pyruvateFlux', label: 'Piruvato processado', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.pyruvatePerMin },
    { key: 'fattyAcidFlux', label: 'Ácido graxo processado', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.fattyAcidPerMin },
    { key: 'nadhFlux', label: 'NADH processado', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.nadhPerMin },
    { key: 'fadh2Flux', label: 'FADH₂ processado', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.fadh2PerMin },
    { key: 'oxygenFlux', label: 'O₂ processado', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.oxygenPerMin },
    { key: 'protonFlux', label: 'H⁺ bombeado', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.protonsPerMin },
    { key: 'adpFlux', label: 'ADP processado', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.adpPerMin },
    { key: 'atpFlux', label: 'ATP produzido', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.atpPerMin },
    { key: 'waterFlux', label: 'H₂O produzida', unit: 'eq/min', digits: 2, group: 'mitochondria', step: 'mitochondria', read: (_p, c) => c.mitochondria.processing.waterPerMin },

    { key: 'availableGlucose', label: 'Glicose coletável', unit: 'pacotes', digits: 1, group: 'pools', step: 'tissue', read: (_p, c) => c.pools.available.glucose },
    { key: 'availableOxygen', label: 'O₂ disponível no tecido', unit: 'pacotes', digits: 1, group: 'pools', step: 'tissue', read: (_p, c) => c.pools.available.oxygen },
    { key: 'availableFattyAcid', label: 'Ácido graxo coletável', unit: 'pacotes', digits: 1, group: 'pools', step: 'tissue', read: (_p, c) => c.pools.available.fattyAcid },
    { key: 'availableAminoAcid', label: 'Aminoácido coletável', unit: 'pacotes', digits: 1, group: 'pools', step: 'tissue', read: (_p, c) => c.pools.available.aminoAcid },
    { key: 'capturedGlucose', label: 'Glicose captada', unit: 'pacotes', digits: 1, group: 'pools', step: 'mitochondria', read: (_p, c) => c.pools.captured.glucose },
    { key: 'capturedOxygen', label: 'O₂ disponível à CTE', unit: 'pacotes', digits: 1, group: 'pools', step: 'mitochondria', read: (_p, c) => c.pools.captured.oxygen },
    { key: 'capturedFattyAcid', label: 'Ácido graxo captado', unit: 'pacotes', digits: 1, group: 'pools', step: 'mitochondria', read: (_p, c) => c.pools.captured.fattyAcid },
    { key: 'capturedAminoAcid', label: 'Aminoácido captado', unit: 'pacotes', digits: 1, group: 'pools', step: 'mitochondria', read: (_p, c) => c.pools.captured.aminoAcid },
    { key: 'pyruvatePool', label: 'Pool de piruvato', unit: 'pacotes', digits: 1, group: 'pools', step: 'mitochondria', read: (_p, c) => c.pools.pyruvate },
    { key: 'glucoseSaturation', label: 'Ocupação do pool de glicose', unit: '%', digits: 0, group: 'pools', step: 'tissue', read: (_p, c) => c.transportSaturation.glucose },
    { key: 'oxygenSaturation', label: 'Ocupação do fluxo de O₂', unit: '%', digits: 0, group: 'pools', step: 'tissue', read: (_p, c) => c.transportSaturation.oxygen },
    { key: 'fattyAcidSaturation', label: 'Ocupação do pool lipídico', unit: '%', digits: 0, group: 'pools', step: 'tissue', read: (_p, c) => c.transportSaturation.fattyAcid },
    { key: 'aminoAcidSaturation', label: 'Ocupação do pool de aminoácidos', unit: '%', digits: 0, group: 'pools', step: 'tissue', read: (_p, c) => c.transportSaturation.aminoAcid },
    { key: 'captureChain', label: 'Sequência de captação', unit: 'ações', digits: 0, group: 'pools', step: 'tissue', read: (_p, c) => c.collection.chain },
    { key: 'captureScore', label: 'Pontuação de captação', unit: 'pts', digits: 0, group: 'pools', step: 'tissue', read: (_p, c) => c.collection.score },
] as const satisfies readonly ScenarioMetricDefinitionShape[];

export type ScenarioMetricKey = typeof SCENARIO_METRICS[number]['key'];
export type ScenarioMetricDefinition = typeof SCENARIO_METRICS[number];

export const ALL_SCENARIO_METRIC_KEYS = SCENARIO_METRICS.map(metric => metric.key) as ScenarioMetricKey[];

export const SCENARIO_METRIC_CATALOG = Object.fromEntries(
    SCENARIO_METRICS.map(metric => [metric.key, metric]),
) as Record<ScenarioMetricKey, ScenarioMetricDefinition>;

export interface ScenarioMetricSnapshot {
    time: number;
    values: Record<ScenarioMetricKey, number>;
}

export function createScenarioMetricSnapshot(
    physiology: PhysiologyState,
    cellular: CellularState,
): ScenarioMetricSnapshot {
    return {
        time: physiology.timeElapsed,
        values: Object.fromEntries(
            SCENARIO_METRICS.map(metric => [metric.key, metric.read(physiology, cellular)]),
        ) as Record<ScenarioMetricKey, number>,
    };
}

export function getScenarioMetricKeysByGroup(group: ScenarioMetricGroup): ScenarioMetricKey[] {
    return SCENARIO_METRICS.filter(metric => metric.group === group).map(metric => metric.key);
}
