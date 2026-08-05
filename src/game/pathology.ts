import type {
    DiseasePreset,
    EndocrineRegulationState,
    PathophysiologyState,
    PhysiologicalCapacities,
    PhysiologyState,
    RenalRegulationState,
} from './types';

export interface DiseasePresetDefinition {
    id: DiseasePreset;
    label: string;
    description: string;
    mechanism: string;
}

export const DISEASE_PRESETS: DiseasePresetDefinition[] = [
    { id: 'healthy', label: 'Adulto saudável', description: 'Reservas orgânicas preservadas e regulação basal.', mechanism: 'Eixos e capacidades próximos de 100%.' },
    { id: 'type1-diabetes', label: 'Diabetes tipo 1', description: 'Falência de célula beta com risco progressivo de cetoacidose.', mechanism: 'Insulina endógena ↓ → glicose/cetonas ↑ → diurese osmótica e acidose.' },
    { id: 'type2-diabetes', label: 'Diabetes tipo 2', description: 'Resistência insulínica com reserva beta parcial.', mechanism: 'Captação ↓ → hiperinsulinemia compensatória e hiperglicemia.' },
    { id: 'respiratory-failure', label: 'Falência respiratória', description: 'Baixa capacidade ventilatória com desigualdade V/Q e shunt.', mechanism: 'PAO₂ pode estar disponível, mas parte do sangue não é oxigenada.' },
    { id: 'renal-failure', label: 'Insuficiência renal', description: 'Queda de filtração e compensação hidroeletrolítica/ácido-base.', mechanism: 'GFR ↓ → retenção de K⁺/água e menor regeneração de bicarbonato.' },
    { id: 'sepsis', label: 'Sepse', description: 'Ativação imune, vasoplegia, leak capilar e disfunção mitocondrial.', mechanism: 'Infecção → inflamação → tônus/perfusão ↓, lactato e dano ↑.' },
    { id: 'hypothyroidism', label: 'Hipotireoidismo primário', description: 'Falha da glândula com T4/T3 baixos e TSH compensatoriamente alto.', mechanism: 'Capacidade tireoidiana ↓ → T4/T3 ↓ → TSH ↑, TMB e termogênese ↓.' },
    { id: 'hyperthyroidism', label: 'Hipertireoidismo', description: 'Excesso sustentado do eixo tireoidiano.', mechanism: 'T3/T4 ↑ → TMB, consumo de O₂, termogênese e sensibilidade adrenérgica ↑.' },
    { id: 'cushing-syndrome', label: 'Síndrome de Cushing', description: 'Produção autônoma ou exposição persistente a cortisol.', mechanism: 'Cortisol cronicamente ↑ → gliconeogênese, resistência insulínica, pressão e catabolismo ↑.' },
    { id: 'adrenal-insufficiency', label: 'Insuficiência adrenal', description: 'Baixa reserva de cortisol sob estresse.', mechanism: 'Cortisol ↓ → menor tônus permissivo e menor suporte glicêmico.' },
];

export const createHealthyCapacities = (): PhysiologicalCapacities => ({
    pancreaticBetaReserve: 1,
    insulinSensitivity: 1,
    hepaticGlucoseResponsiveness: 1,
    adrenalReserve: 1,
    adrenalCortisolAutonomy: 0,
    thyroidGlandCapacity: 1,
    leptinSensitivity: 1,
    renalFunction: 1,
    ventilatoryCapacity: 1,
    vascularToneResponsiveness: 1,
    // Capacidade imune disponível, não inflamação basal. O estado inflamatório
    // fica em allostaticLoad/pathophysiology e pode subir sem reduzir esta reserva.
    immuneActivation: 1,
    mitochondrialCapacity: 1,
});

export const createInitialEndocrineState = (): EndocrineRegulationState => ({
    hpaDrive: .15,
    crhDrive: .15,
    acthDrive: .15,
    sympatheticDrive: .12,
    thyroidDrive: 1,
    insulinReceptorSensitivity: 1,
    adrenergicReceptorSensitivity: 1,
    glucocorticoidSensitivity: 1,
    anabolicSensitivity: 1,
    leptinSensitivity: 1,
    orexigenicDrive: .25,
    anorexigenicDrive: .35,
    cortisolExposure: 10,
    catecholamineExposure: 8,
    thyroidExposure: 20,
});

export const createInitialRenalState = (): RenalRegulationState => ({
    gfr: 125,
    renalBloodFlow: 1100,
    urineFlow: 1,
    urineOsmolality: 500,
    adhActivity: 35,
    aldosteroneActivity: 35,
    reninActivity: 20,
    angiotensinIIActivity: 20,
    raasActivity: 20,
    anpActivity: 20,
    proximalReabsorption: 65,
    distalSodiumReabsorption: 2,
    freeWaterReabsorption: 70,
    pthActivity: 35,
    calcitriolActivity: 55,
    epoActivity: 35,
});

export const createInitialPathophysiology = (): PathophysiologyState => ({
    preset: 'healthy',
    diseaseBurden: 0,
    infectionSeverity: 0,
    capillaryLeak: 0,
    osmoticDiuresis: 0,
    ketoneProduction: 0,
});

/** Aplica o ponto de partida; a progressão subsequente é calculada pelo motor. */
export function applyDiseasePreset(state: PhysiologyState, preset: DiseasePreset): PhysiologyState {
    const capacities = createHealthyCapacities();
    const endocrine = createInitialEndocrineState();
    const renal = createInitialRenalState();
    const pathophysiology = createInitialPathophysiology();
    pathophysiology.preset = preset;

    const next: PhysiologyState = {
        ...state,
        capacities,
        endocrine,
        renal,
        pathophysiology,
        nutrients: { ...state.nutrients, ketones: .2 },
        hormones: { ...state.hormones },
        respiratory: { ...state.respiratory, shuntFraction: .03, vqEfficiency: .98, lungCompliance: 100 },
        cardiovascular: { ...state.cardiovascular },
        allostaticLoad: { ...state.allostaticLoad },
    };

    switch (preset) {
        case 'type1-diabetes':
            capacities.pancreaticBetaReserve = .02;
            pathophysiology.diseaseBurden = 45;
            next.nutrients.bloodGlucose = 155;
            next.nutrients.ketones = .7;
            next.hormones.insulin = 2;
            next.hormones.glucagon = 125;
            break;
        case 'type2-diabetes':
            capacities.insulinSensitivity = .32;
            capacities.pancreaticBetaReserve = .68;
            capacities.leptinSensitivity = .42;
            endocrine.insulinReceptorSensitivity = .35;
            endocrine.leptinSensitivity = .45;
            pathophysiology.diseaseBurden = 35;
            next.nutrients.bloodGlucose = 125;
            next.hormones.insulin = 22;
            next.hormones.leptin = 24;
            next.hormones.adiponectin = 5;
            break;
        case 'respiratory-failure':
            capacities.ventilatoryCapacity = .55;
            pathophysiology.diseaseBurden = 55;
            next.respiratory.shuntFraction = .22;
            next.respiratory.vqEfficiency = .64;
            next.respiratory.lungCompliance = 62;
            break;
        case 'renal-failure':
            capacities.renalFunction = .24;
            pathophysiology.diseaseBurden = 60;
            renal.gfr = 32;
            next.nutrients.potassium = 4.8;
            break;
        case 'sepsis':
            capacities.immuneActivation = .9;
            capacities.vascularToneResponsiveness = .48;
            capacities.mitochondrialCapacity = .68;
            pathophysiology.diseaseBurden = 65;
            pathophysiology.infectionSeverity = 70;
            pathophysiology.capillaryLeak = .32;
            next.allostaticLoad.inflammationLevel = 45;
            break;
        case 'hypothyroidism':
            capacities.thyroidGlandCapacity = .14;
            endocrine.thyroidDrive = 1.8;
            pathophysiology.diseaseBurden = 48;
            next.hormones.t3 = 48;
            next.hormones.t4 = 2.2;
            next.hormones.tsh = 14;
            next.bodyTemperature = 35.9;
            next.cardiovascular.heartRate = 56;
            break;
        case 'hyperthyroidism':
            capacities.thyroidGlandCapacity = 1.75;
            endocrine.thyroidDrive = 1.45;
            pathophysiology.diseaseBurden = 45;
            next.hormones.t3 = 210;
            next.hormones.t4 = 14;
            next.hormones.tsh = .2;
            break;
        case 'cushing-syndrome':
            capacities.adrenalCortisolAutonomy = .82;
            capacities.insulinSensitivity = .48;
            endocrine.insulinReceptorSensitivity = .52;
            endocrine.cortisolExposure = 82;
            pathophysiology.diseaseBurden = 58;
            next.hormones.cortisol = 48;
            next.hormones.insulin = 24;
            next.nutrients.bloodGlucose = 148;
            next.cardiovascular.systolicBP = 148;
            next.cardiovascular.diastolicBP = 94;
            next.cardiovascular.meanArterialPressure = 112;
            break;
        case 'adrenal-insufficiency':
            capacities.adrenalReserve = .12;
            pathophysiology.diseaseBurden = 45;
            next.hormones.cortisol = 4;
            break;
        default:
            break;
    }
    return next;
}
