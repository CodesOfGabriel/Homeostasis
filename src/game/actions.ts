/**
 * Homeostasis v3.0 - Hormonal Actions
 * Sistema de ações baseado em liberação hormonal
 * O jogador controla os "sinais", o corpo reage
 */

// ============================================================================
// HORMONAL ACTIONS DEFINITIONS
// ============================================================================

export interface HormonalActionDefinition {
    id: string;
    name: string;
    description: string;
    hormone: string;
    baseAmount: number;
    cooldown: number; // segundos
    metabolicCost: number; // mmol ATP
    category: 'anabolic' | 'catabolic' | 'regulatory';
    effects: string[];
    warnings: string[];
}

export const HORMONAL_ACTIONS: HormonalActionDefinition[] = [
    // ============================================================================
    // AÇÕES ANABÓLICAS
    // ============================================================================
    {
        id: 'release-insulin',
        name: 'Liberar Insulina',
        description: 'Força armazenamento de glicose como glicogênio e gordura',
        hormone: 'insulin',
        baseAmount: 20, // μIU/mL
        cooldown: 120, // 2 minutos
        metabolicCost: 0.5,
        category: 'anabolic',
        effects: [
            'Aumenta captação celular de glicose',
            'Promove síntese de glicogênio (fígado/músculo)',
            'Inibe gliconeogênese',
            'Lipogênese (armazenamento de gordura)',
            'Ativa via mTOR (síntese proteica)',
        ],
        warnings: [
            'Pode causar hipoglicemia se glicose já estiver baixa',
            'Uso crônico = ganho de gordura',
        ],
    },
    {
        id: 'release-gh',
        name: 'Liberar GH',
        description: 'Hormônio do crescimento - promove hipertrofia e lipólise',
        hormone: 'gh',
        baseAmount: 5, // ng/mL
        cooldown: 3600, // 1 hora
        metabolicCost: 2,
        category: 'anabolic',
        effects: [
            'Estimula síntese proteica muscular',
            'Promove lipólise (queima de gordura)',
            'Aumenta retenção de nitrogênio',
            'Efeito anti-catabólico',
            'Estimula produção de IGF-1',
        ],
        warnings: [
            'Efeito lento (horas)',
            'Requer nutrição adequada',
        ],
    },
    {
        id: 'release-testosterone',
        name: 'Liberar Testosterona',
        description: 'Hormônio anabólico primário - força e massa muscular',
        hormone: 'testosterone',
        baseAmount: 300, // ng/dL
        cooldown: 7200, // 2 horas
        metabolicCost: 3,
        category: 'anabolic',
        effects: [
            'Máxima síntese proteica',
            'Hipertrofia muscular',
            'Aumenta força contrátil',
            'Reduz gordura corporal',
            'Melhora recuperação',
        ],
        warnings: [
            'Efeito muito lento (dias)',
            'Requer descanso adequado',
        ],
    },

    // ============================================================================
    // AÇÕES CATABÓLICAS
    // ============================================================================
    {
        id: 'release-glucagon',
        name: 'Liberar Glucagon',
        description: 'Mobiliza glicogênio hepático para manter glicemia',
        hormone: 'glucagon',
        baseAmount: 100, // pg/mL
        cooldown: 180, // 3 minutos
        metabolicCost: 0.3,
        category: 'catabolic',
        effects: [
            'Glicogenólise (quebra glicogênio hepático)',
            'Gliconeogênese (produção de glicose)',
            'Aumenta glicemia',
            'Antagonista da insulina',
        ],
        warnings: [
            'Esgota reservas de glicogênio',
            'Pode causar hiperglicemia se usado em excesso',
        ],
    },
    {
        id: 'release-adrenaline',
        name: 'Liberar Adrenalina',
        description: 'Resposta de luta ou fuga - mobilização máxima de energia',
        hormone: 'adrenaline',
        baseAmount: 200, // pg/mL
        cooldown: 300, // 5 minutos
        metabolicCost: 1,
        category: 'catabolic',
        effects: [
            'Taquicardia (aumenta FC drasticamente)',
            'Glicogenólise muscular e hepática',
            'Lipólise intensa (mobilização de gordura)',
            'Broncodilatação (aumenta VO2)',
            'Vasoconstrição periférica',
        ],
        warnings: [
            'Aumenta muito a carga alostática',
            'Pode causar arritmias se pH estiver baixo',
            'Consome rapidamente reservas energéticas',
        ],
    },
    {
        id: 'release-cortisol',
        name: 'Liberar Cortisol',
        description: 'Hormônio do estresse - mobiliza recursos em emergências',
        hormone: 'cortisol',
        baseAmount: 30, // μg/dL
        cooldown: 600, // 10 minutos
        metabolicCost: 1.5,
        category: 'catabolic',
        effects: [
            'Gliconeogênese a partir de aminoácidos',
            'Catabolismo muscular (quebra proteína)',
            'Lipólise',
            'Imunossupressão',
            'Aumenta glicemia',
        ],
        warnings: [
            'Uso crônico = perda de massa muscular',
            'Aumenta inflamação sistêmica',
            'Prejudica recuperação',
        ],
    },

    // ============================================================================
    // AÇÕES REGULATÓRIAS
    // ============================================================================
    {
        id: 'increase-t3',
        name: 'Aumentar T3',
        description: 'Hormônio tireoidiano ativo - aumenta taxa metabólica',
        hormone: 't3',
        baseAmount: 50, // ng/dL
        cooldown: 14400, // 4 horas
        metabolicCost: 2,
        category: 'regulatory',
        effects: [
            'Aumenta TMB (taxa metabólica basal)',
            'Acelera consumo de O2',
            'Termogênese',
            'Melhora oxidação de gorduras',
            'Sensibiliza receptores adrenérgicos',
        ],
        warnings: [
            'Aumenta demanda energética permanentemente',
            'Pode causar taquicardia',
            'Efeito lento (horas a dias)',
        ],
    },
    {
        id: 'boost-mtor',
        name: 'Ativar via mTOR',
        description: 'Via de sinalização anabólica - síntese proteica',
        hormone: 'mTORActivity',
        baseAmount: 30, // % ativação
        cooldown: 1800, // 30 minutos
        metabolicCost: 1,
        category: 'anabolic',
        effects: [
            'Síntese proteica muscular',
            'Requer: aminoácidos + energia',
            'Ativada por: insulina + IGF-1 + leucina',
            'Inibe autofagia',
        ],
        warnings: [
            'Requer nutrição adequada',
            'Consome muita energia',
        ],
    },
];

// ============================================================================
// ACTION HELPERS
// ============================================================================

/**
 * Busca definição de ação por ID
 */
export function getActionDefinition(actionId: string): HormonalActionDefinition | undefined {
    return HORMONAL_ACTIONS.find(a => a.id === actionId);
}

/**
 * Busca ações por categoria
 */
export function getActionsByCategory(category: 'anabolic' | 'catabolic' | 'regulatory'): HormonalActionDefinition[] {
    return HORMONAL_ACTIONS.filter(a => a.category === category);
}

/**
 * Verifica se ação é segura no estado atual
 */
export function isActionSafe(
    actionId: string,
    currentState: {
        glucose: number;
        pH: number;
        heartRate: number;
        energyDeficit: number;
    }
): { safe: boolean; reason?: string } {
    const action = getActionDefinition(actionId);
    if (!action) return { safe: false, reason: 'Ação não encontrada' };

    // Insulina + Glicose baixa = Hipoglicemia
    if (action.id === 'release-insulin' && currentState.glucose < 70) {
        return {
            safe: false,
            reason: 'Glicemia já está baixa. Insulina causaria hipoglicemia severa.',
        };
    }

    // Adrenalina + pH baixo = Risco de arritmia
    if (action.id === 'release-adrenaline' && currentState.pH < 7.2) {
        return {
            safe: false,
            reason: 'pH sanguíneo muito baixo. Adrenalina pode causar arritmia letal.',
        };
    }

    // Adrenalina + FC alta = Taquicardia extrema
    if (action.id === 'release-adrenaline' && currentState.heartRate > 150) {
        return {
            safe: false,
            reason: 'FC já muito elevada. Risco de taquicardia ventricular.',
        };
    }

    // Cortisol crônico = Catabolismo excessivo
    if (action.id === 'release-cortisol' && currentState.energyDeficit > 50) {
        return {
            safe: false,
            reason: 'Déficit energético alto. Cortisol causará catabolismo muscular severo.',
        };
    }

    return { safe: true };
}

/**
 * Calcula dose ajustada baseada no contexto
 */
export function calculateAdjustedDose(
    _actionId: string,
    baseAmount: number,
    context: {
        bodyMass: number;     // kg
        muscleMass: number;   // kg
        sensitivity: number;  // 0-100 (sensibilidade a hormônios)
    }
): number {
    // Ajustar dose pelo peso corporal (normalizado para 70kg)
    const massAdjustment = context.bodyMass / 70;

    // Ajustar pela sensibilidade (resistência insulínica, downregulation, etc)
    const sensitivityAdjustment = context.sensitivity / 100;

    return baseAmount * massAdjustment * (0.5 + sensitivityAdjustment * 0.5);
}

// ============================================================================
// COMBO SYSTEM (Sinergia Hormonal)
// ============================================================================

export interface HormonalCombo {
    name: string;
    description: string;
    hormones: string[];
    synergy: number; // Multiplicador de efeito (1.0 = normal, 2.0 = dobro)
    conditions: string[];
}

export const HORMONAL_COMBOS: HormonalCombo[] = [
    {
        name: 'Anabolismo Máximo',
        description: 'Tríade anabólica perfeita para hipertrofia',
        hormones: ['insulin', 'gh', 'testosterone'],
        synergy: 2.5,
        conditions: [
            'Glicose > 100 mg/dL',
            'Aminoácidos disponíveis',
            'Em repouso (FC < 80 bpm)',
        ],
    },
    {
        name: 'Mobilização Energética',
        description: 'Quebra máxima de reservas energéticas',
        hormones: ['glucagon', 'adrenaline'],
        synergy: 1.8,
        conditions: [
            'Glicose < 80 mg/dL',
            'Demanda energética alta',
        ],
    },
    {
        name: 'Resposta ao Estresse',
        description: 'Eixo HPA ativado - mobilização total',
        hormones: ['cortisol', 'adrenaline'],
        synergy: 2.0,
        conditions: [
            'Carga alostática > 50',
            'Glicogênio < 30%',
        ],
    },
    {
        name: 'Termogênese',
        description: 'Queima de gordura acelerada',
        hormones: ['t3', 'adrenaline'],
        synergy: 1.6,
        conditions: [
            'Glicose estável',
            'Ácidos graxos disponíveis',
        ],
    },
];

/**
 * Detecta combos ativos baseado em hormônios circulantes
 */
export function detectActiveCombos(
    hormonalProfile: Record<string, number>
): HormonalCombo[] {
    const activeHormones = Object.entries(hormonalProfile)
        .filter(([, value]) => value > 0)
        .map(([hormone]) => hormone);

    return HORMONAL_COMBOS.filter(combo =>
        combo.hormones.every(h => activeHormones.includes(h))
    );
}

// ============================================================================
// ACTION CATEGORIES FOR UI
// ============================================================================

export const ACTION_CATEGORIES = {
    anabolic: {
        name: 'Anabólicas',
        description: 'Construção, crescimento, armazenamento',
        color: 'normal',
        icon: '💪',
    },
    catabolic: {
        name: 'Catabólicas',
        description: 'Mobilização, quebra, liberação de energia',
        color: 'alert',
        icon: '⚡',
    },
    regulatory: {
        name: 'Regulatórias',
        description: 'Controle metabólico, homeostase',
        color: 'hormonal',
        icon: '⚙️',
    },
} as const;
