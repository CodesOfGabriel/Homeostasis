/**
 * Homeostasis v3.0 - Type Definitions
 * Sistema de tipos para simulação fisiológica realista
 */

// ============================================================================
// ENERGY SYSTEMS
// ============================================================================

/**
 * Matriz Energética Trifásica
 * Representa os três sistemas de produção de ATP do corpo humano
 */
export interface EnergyMatrix {
    // Phosphagen System (ATP-PCr) - Imediato, dura ~10s
    atpPool: number;              // mmol - ATP disponível imediatamente
    pCrStore: number;             // mmol - Fosfocreatina (reserva rápida)
    maxATP: number;               // mmol - Capacidade máxima do pool
    maxPCr: number;               // mmol - Capacidade máxima de PCr

    // Glycolytic System (Anaeróbio) - Rápido mas produz lactato
    glycolyticRate: number;       // mmol/min - Taxa de glicólise
    lactateLevel: number;         // mmol/L - Concentração de lactato
    lactateClearance: number;     // mmol/min - Taxa de remoção de lactato

    // Oxidative System (Aeróbio) - Lento mas eficiente
    aerobicContribution: number;  // % - Contribuição do sistema oxidativo
    vo2Current: number;           // mL/kg/min - Consumo de O2 atual
    vo2Max: number;               // mL/kg/min - Consumo máximo de O2

    // Demanda energética
    atpDemand: number;            // mmol/min - Demanda total de ATP
    energyDeficit: number;        // mmol - Déficit acumulado
}

/**
 * Substrato Energético
 * Determina qual combustível está sendo predominantemente usado
 */
export type EnergySubstrate = 'glucose' | 'fatty-acids' | 'amino-acids' | 'mixed';

/**
 * Respiratory Exchange Ratio (RER)
 * Indica a mistura de combustíveis sendo oxidados
 * RER = VCO2 / VO2
 * - 1.0 = 100% Carboidrato
 * - 0.85 = Mistura
 * - 0.7 = 100% Gordura
 */
export interface RespiratoryExchange {
    rer: number;                  // Ratio - 0.7 a 1.0+
    vco2: number;                 // mL/min - Produção de CO2
    vo2: number;                  // mL/min - Consumo de O2
    substrate: EnergySubstrate;   // Substrato predominante
}

// ============================================================================
// NUTRIENT STATE
// ============================================================================

/**
 * Estado Nutricional Circulante
 * Representa os nutrientes disponíveis no sangue e armazenados
 */
export interface NutrientState {
    // Carboidratos
    bloodGlucose: number;         // mg/dL - Glicose sanguínea (70-100 normal)
    liverGlycogen: number;        // g - Glicogênio hepático (max ~100g)
    muscleGlycogen: number;       // g - Glicogênio muscular (max ~400g)

    // Lipídios
    fattyAcids: number;           // mmol/L - Ácidos graxos livres
    triglycerides: number;        // mg/dL - Triglicerídeos
    adiposeTissue: number;        // kg - Massa de tecido adiposo

    // Proteínas
    aminoAcids: number;           // mg/dL - Pool de aminoácidos
    muscleMass: number;           // kg - Massa muscular total
    proteinSynthesisRate: number; // g/day - Taxa de síntese proteica

    // Hidratação e eletrólitos
    hydration: number;            // L - Volume total de água corporal
    sodium: number;               // mmol/L - Sódio (135-145 normal)
    potassium: number;            // mmol/L - Potássio (3.5-5.0 normal)
    ketones: number;              // mmol/L - Corpos cetônicos circulantes (<0.6 basal)

    // Estado metabólico
    fedState: boolean;            // true = fed, false = fasted
    hoursSinceMeal: number;       // hours - Tempo desde última refeição
}

// ============================================================================
// HORMONAL PROFILE
// ============================================================================

/**
 * Perfil Hormonal
 * Concentrações hormonais em unidades clínicas reais
 */
export interface HormonalProfile {
    // Hormônios Anabólicos
    insulin: number;              // μIU/mL - Insulina (2-25 normal)
    gh: number;                   // ng/mL - Hormônio do Crescimento (0-10 normal)
    testosterone: number;         // ng/dL - Testosterona (300-1000 homens)
    igf1: number;                 // ng/mL - IGF-1 (100-300 normal)

    // Hormônios Catabólicos
    cortisol: number;             // μg/dL - Cortisol (5-25 normal)
    glucagon: number;             // pg/mL - Glucagon (50-150 normal)
    adrenaline: number;           // pg/mL - Adrenalina (0-100 normal)
    noradrenaline: number;        // pg/mL - Noradrenalina (100-500 normal)

    // Hormônios Tireoidianos
    t3: number;                   // ng/dL - Triiodotironina (80-200 normal)
    t4: number;                   // μg/dL - Tiroxina (5-12 normal)
    tsh: number;                  // μIU/mL - TSH (0.5-5.0 normal)

    // Sinalização mTOR (calculado, não hormônio real)
    mTORActivity: number;         // 0-100% - Atividade da via mTOR
}

/**
 * Ação Hormonal
 * Representa uma ação hormonal que o jogador pode executar
 */
export interface HormonalAction {
    actionId: string;             // ID da configuração única que originou a ação
    hormone: keyof HormonalProfile;
    amount: number;               // Quantidade a liberar (em unidades do hormônio)
    duration: number;             // ms - Tempo restante do efeito
    totalDuration: number;        // ms - Duração inicial (normaliza a dose no tempo)
    cooldown: number;             // s - Tempo até poder usar novamente
    metabolicCost: number;        // mmol ATP - Custo energético da síntese
}

// ============================================================================
// CARDIOVASCULAR & RESPIRATORY
// ============================================================================

/**
 * Parâmetros Cardiovasculares
 */
export interface CardiovascularState {
    // Frequência e Ritmo
    heartRate: number;            // bpm - Frequência cardíaca (60-100 repouso)
    heartRateVariability: number; // ms - HRV (RMSSD)
    rhythm: 'sinus' | 'arrhythmia' | 'fibrillation';

    // Pressão Arterial
    systolicBP: number;           // mmHg - Pressão sistólica (120 normal)
    diastolicBP: number;          // mmHg - Pressão diastólica (80 normal)
    meanArterialPressure: number; // mmHg - MAP = DAP + 1/3(SAP-DAP)

    // Débito Cardíaco
    strokeVolume: number;         // mL - Volume sistólico (70 normal)
    cardiacOutput: number;        // L/min - DC = SV × FC (5 normal)
    ejectionFraction: number;     // % - Fração de ejeção (55-70 normal)

    // Resistência Vascular
    systemicVascularResistance: number; // dyn·s/cm⁵ - RVS (800-1200 normal)

    // Perfusão
    perfusionIndex: number;       // % - Índice de perfusão periférica
}

/**
 * Parâmetros Respiratórios
 */
export interface RespiratoryState {
    // Ventilação
    respiratoryRate: number;      // resp/min - Frequência respiratória (12-20 normal)
    tidalVolume: number;          // mL - Volume corrente (500 normal)
    minuteVentilation: number;    // L/min - VE = TV × RR (6-10 normal)

    // Oxigenação
    spo2: number;                 // % - Saturação de O2 (95-100 normal)
    pao2: number;                 // mmHg - Pressão parcial de O2 arterial (80-100 normal)
    paco2: number;                // mmHg - Pressão parcial de CO2 arterial (35-45 normal)

    // Mecânica
    lungCompliance: number;       // mL/cmH2O - Complacência pulmonar
    deadSpace: number;            // mL - Espaço morto anatômico
    shuntFraction: number;        // 0-0.6 - Fração de shunt fisiológico/patológico
    vqEfficiency: number;         // 0-1 - Eficiência da relação ventilação/perfusão
}

// ============================================================================
// REGULATORY CAPACITY & PATHOPHYSIOLOGY
// ============================================================================

export type DiseasePreset =
    | 'healthy'
    | 'type1-diabetes'
    | 'type2-diabetes'
    | 'respiratory-failure'
    | 'renal-failure'
    | 'sepsis'
    | 'hyperthyroidism'
    | 'adrenal-insufficiency';

/** Reservas latentes: doenças alteram capacidades, não marcadores isolados. */
export interface PhysiologicalCapacities {
    pancreaticBetaReserve: number;
    insulinSensitivity: number;
    hepaticGlucoseResponsiveness: number;
    adrenalReserve: number;
    thyroidGlandCapacity: number;
    renalFunction: number;
    ventilatoryCapacity: number;
    vascularToneResponsiveness: number;
    immuneActivation: number;
    mitochondrialCapacity: number;
}

/** Estado dos eixos, exposição acumulada e sensibilidade efetora. */
export interface EndocrineRegulationState {
    hpaDrive: number;
    sympatheticDrive: number;
    thyroidDrive: number;
    insulinReceptorSensitivity: number;
    adrenergicReceptorSensitivity: number;
    glucocorticoidSensitivity: number;
    anabolicSensitivity: number;
    cortisolExposure: number;
    catecholamineExposure: number;
    thyroidExposure: number;
}

export interface RenalRegulationState {
    gfr: number;                  // mL/min
    urineFlow: number;            // mL/min
    adhActivity: number;          // 0-100
    aldosteroneActivity: number;  // 0-100
    raasActivity: number;         // 0-100
}

export interface PathophysiologyState {
    preset: DiseasePreset;
    diseaseBurden: number;        // 0-100
    infectionSeverity: number;    // 0-100
    capillaryLeak: number;        // fração 0-0.55
    osmoticDiuresis: number;
    ketoneProduction: number;
}

export interface CellularFeedback {
    lactateFlux: number;
    carbonDioxideFlux: number;
    inflammationSignal: number;
    oxygenDemand: number;
    viabilitySignal: number;
    barrierFailureSignal: number;
    apoptoticSignal: number;
}

/**
 * Contexto imposto pelo motor de eventos. Ele continua sendo uma entrada do
 * modelo, mas não é uma configuração manipulável pelo jogador.
 */
export interface PhysiologicalContextFactors {
    exercise: number;
    nutrition: number;
    stress: number;
    sleep: number;
    temperature: number;
}

export interface CausalTrace {
    id: string;
    title: string;
    context: string;
    steps: string[];
    timestamp: number;
    severity: 'info' | 'warning' | 'critical';
}

// ============================================================================
// ACID-BASE BALANCE
// ============================================================================

/**
 * Equilíbrio Ácido-Base
 * Sistema crítico - falha letal se pH < 6.8 ou > 7.8
 */
export interface AcidBaseBalance {
    pH: number;                   // pH sanguíneo arterial (7.35-7.45 normal)
    bicarbonate: number;          // mmol/L - HCO3- (22-26 normal)
    pco2: number;                 // mmHg - Pressão parcial de CO2 (35-45 normal)
    baseExcess: number;           // mmol/L - Excesso de base (-2 a +2 normal)
    anionGap: number;             // mmol/L - Gap aniônico (8-16 normal)

    // Estado
    state: 'normal' | 'acidosis-metabolic' | 'acidosis-respiratory' |
    'alkalosis-metabolic' | 'alkalosis-respiratory' | 'mixed';

    // Compensação
    compensationActive: boolean;  // Sistema de compensação ativo
    compensationRate: number;     // mmol/min - Taxa de correção
}

// ============================================================================
// ORGAN STATES
// ============================================================================

/**
 * Estado de um Órgão
 */
export interface OrganState {
    name: string;
    mass: number;                 // kg - Massa do órgão
    perfusion: number;            // % - Perfusão relativa (0-100)
    oxygenation: number;          // % - Oxigenação (0-100)
    metabolicRate: number;        // kcal/day - Taxa metabólica do órgão
    damage: number;               // % - Dano acumulado (0-100)
    functionality: number;        // % - Funcionalidade (0-100)

    // Crescimento
    canGrow: boolean;
    growthRate: number;           // g/day - Taxa de crescimento
    growthSignaling: number;      // 0-100% - Sinalização anabólica recebida
}

/**
 * Coleção de Órgãos
 */
export interface OrganSystem {
    heart: OrganState;
    lungs: OrganState;
    liver: OrganState;
    kidneys: OrganState;
    brain: OrganState;
    muscles: OrganState;
    adipose: OrganState;
    gut: OrganState;
}

// ============================================================================
// ALLOSTATIC LOAD
// ============================================================================

/**
 * Carga Alostática
 * Representa o "custo" fisiológico de manter homeostase sob estresse
 */
export interface AllostaticLoad {
    currentLoad: number;          // 0-100 - Carga atual
    maxCapacity: number;          // 100 - Capacidade máxima
    recoveryRate: number;         // units/hour - Taxa de recuperação

    // Contribuições
    metabolicStress: number;      // 0-100
    cardiovascularStress: number; // 0-100
    oxidativeStress: number;      // 0-100
    inflammationLevel: number;    // 0-100

    // Consequências
    fatigueLevel: number;         // 0-100
    adaptationCapacity: number;   // 0-100 - Capacidade de adaptação restante
}

// ============================================================================
// COMPLETE PHYSIOLOGY STATE
// ============================================================================

/**
 * Estado Fisiológico Completo
 * Agregação de todos os sistemas
 */
export interface PhysiologyState {
    // Core Systems
    energy: EnergyMatrix;
    nutrients: NutrientState;
    hormones: HormonalProfile;
    endocrine: EndocrineRegulationState;
    capacities: PhysiologicalCapacities;
    renal: RenalRegulationState;
    pathophysiology: PathophysiologyState;

    // Organ Systems
    cardiovascular: CardiovascularState;
    respiratory: RespiratoryState;
    organs: OrganSystem;

    // Homeostasis
    acidBase: AcidBaseBalance;
    allostaticLoad: AllostaticLoad;

    // Respiratory Exchange
    respiratoryExchange: RespiratoryExchange;

    // Metabolic State
    basalMetabolicRate: number;   // kcal/day - TMB
    totalEnergyExpenditure: number; // kcal/day - TDEE
    activityLevel: number;        // 0-100 - Nível de atividade física
    bodyTemperature: number;      // °C - Temperatura corporal central

    // Time
    timeElapsed: number;          // seconds - Tempo fisiológico agudo; o calendário narrativo é comprimido separadamente
    cyclePhase: 'awake' | 'sleep'; // Fase do ciclo circadiano

    // Critical State
    isAlive: boolean;
    causeOfDeath?: string;
}

// ============================================================================
// SIMULATION PARAMETERS
// ============================================================================

/**
 * Parâmetros de Entrada da Simulação
 * Usados para calcular o próximo tick
 */
export interface SimulationInput {
    deltaTime: number;            // seconds - Tempo desde último tick
    hormonalActions: HormonalAction[]; // Ações hormonais ativas
    externalFactors: PhysiologicalContextFactors;
    interventions: {
        heartRateTarget: number;          // bpm - comando autonômico/pacing desejado
        ventilationDrive: number;         // % - drive ventilatório relativo ao basal
        renalWaterReabsorption: number;   // % do filtrado reabsorvido
        waterAbsorptionRate: number;      // mL/min absorvidos no trato gastrointestinal
    };
    cellularFeedback?: CellularFeedback;
}

/**
 * Resultado do Tick de Simulação
 */
export interface SimulationOutput {
    newState: PhysiologyState;
    events: PhysiologicalEvent[];
    warnings: PhysiologicalWarning[];
}

/**
 * Evento Fisiológico
 */
export interface PhysiologicalEvent {
    type: 'system' | 'environmental' | 'metabolic' | 'cardiovascular' |
    'respiratory' | 'hormonal' | 'renal' | 'cellular' | 'critical';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: number;
    affectedSystems: string[];
    causalTrace?: CausalTrace;
}

/**
 * Aviso Fisiológico
 */
export interface PhysiologicalWarning {
    parameter: string;
    currentValue: number;
    normalRange: [number, number];
    severity: 'mild' | 'moderate' | 'severe';
    recommendation: string;
    navigationTarget?: 'tissue' | 'mitochondria' | 'defense' | 'vitals';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Constantes Fisiológicas
 */
export const PHYSIOLOGY_CONSTANTS = {
    // Limites Letais
    PH_LETHAL_LOW: 6.8,
    PH_LETHAL_HIGH: 7.8,
    PH_NORMAL_LOW: 7.35,
    PH_NORMAL_HIGH: 7.45,

    // Glucose
    GLUCOSE_NORMAL_LOW: 70,       // mg/dL
    GLUCOSE_NORMAL_HIGH: 100,
    GLUCOSE_HYPOGLYCEMIA: 55,
    GLUCOSE_HYPERGLYCEMIA: 180,

    // Cardiac
    HR_RESTING_MIN: 60,           // bpm
    HR_RESTING_MAX: 100,
    HR_MAX_THEORETICAL: 220,      // - age

    // ATP Production Rates
    ATP_FROM_PCR: 2.5,            // mmol/min (max rate)
    ATP_FROM_GLYCOLYSIS: 1.5,     // mmol glucose
    ATP_FROM_OXIDATION: 30,       // mmol glucose (full oxidation)

    // Time Constants
    PCR_RECOVERY_HALF_LIFE: 30,   // seconds
    LACTATE_CLEARANCE_RATE: 0.3,  // mmol/L/min
} as const;
