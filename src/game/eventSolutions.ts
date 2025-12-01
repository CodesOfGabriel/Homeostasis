// System to map events to optimal action combinations
// This enables strategic gameplay where players need to think about event resolution

export interface EventSolution {
    eventId: string;
    optimalActions: string[]; // IDs of actions that resolve this event effectively
    requiredSubstances?: { // Substance levels needed for optimal resolution
        [key: string]: { min?: number; max?: number };
    };
    bonus?: { // Bonus effects when optimal solution is applied
        [key: string]: number;
    };
    penalty?: { // Penalty for wrong action combinations
        [key: string]: number;
    };
}

// Map events to their optimal solutions
export const EVENT_SOLUTIONS: Record<string, EventSolution> = {
    // Stress events require calming interventions
    stressWork: {
        eventId: 'stressWork',
        optimalActions: ['reduceCortisol', 'vasodilation'],
        requiredSubstances: {
            cortisol: { max: 40 }, // Keep cortisol below 40
            stress: { max: 50 },
        },
        bonus: {
            dopamine: 10,
            energy: 5,
        },
        penalty: {
            stress: 10, // If not resolved properly
        },
    },

    // Exercise requires metabolic support
    exercise: {
        eventId: 'exercise',
        optimalActions: ['increaseVentilation', 'releaseGlucose', 'vasodilation'],
        requiredSubstances: {
            glucose: { min: 70 }, // Need glucose for energy
            bloodOxygen: { min: 90 }, // Need oxygen
        },
        bonus: {
            vo2Max: 2, // Training effect
            energy: 10,
            testosterone: 5,
        },
        penalty: {
            lactate: 5, // Anaerobic metabolism
            energy: -10,
        },
    },

    // Cigarette causes cardiovascular stress
    cigarette: {
        eventId: 'cigarette',
        optimalActions: ['increaseVentilation', 'vasodilation'],
        requiredSubstances: {
            bloodOxygen: { min: 92 },
        },
        bonus: {
            bloodOxygen: 3,
        },
        penalty: {
            heartRate: 5,
            stress: 5,
        },
    },

    // Hypoglycemia needs immediate glucose
    hunger: {
        eventId: 'hunger',
        optimalActions: ['releaseGlucose'],
        requiredSubstances: {
            glucose: { min: 80 },
        },
        bonus: {
            energy: 15,
            dopamine: 5,
        },
        penalty: {
            cortisol: 10,
            energy: -15,
        },
    },

    // Sleep deprivation needs stress reduction and energy
    sleep: {
        eventId: 'sleep',
        optimalActions: ['reduceCortisol', 'releaseGlucose'],
        requiredSubstances: {
            cortisol: { max: 30 },
            melatonin: { min: 30 },
        },
        bonus: {
            energy: 20,
            serotonin: 10,
        },
        penalty: {
            stress: 15,
            dopamine: -10,
        },
    },

    // Coffee creates stimulation that may need management
    coffee: {
        eventId: 'coffee',
        optimalActions: ['increaseVentilation'], // Help with increased metabolism
        requiredSubstances: {
            heartRate: { max: 100 },
        },
        bonus: {
            dopamine: 5,
            energy: 5,
        },
        penalty: {
            stress: 8,
            cortisol: 5,
        },
    },

    // Meditation is generally positive but can be enhanced
    meditation: {
        eventId: 'meditation',
        optimalActions: ['reduceCortisol'], // Amplify the calming effect
        requiredSubstances: {
            stress: { max: 20 },
        },
        bonus: {
            serotonin: 15,
            energy: 10,
            melatonin: 10,
        },
        penalty: {}, // No penalty, meditation is always good
    },

    // New metabolic events
    hyperglycemia: {
        eventId: 'hyperglycemia',
        optimalActions: ['releaseInsulin', 'exercise'],
        requiredSubstances: {
            glucose: { max: 140 },
            insulin: { min: 30 },
        },
        bonus: {
            energy: 10,
            mtor: 10, // Good glucose utilization
        },
        penalty: {
            glucose: 15,
            triglycerides: 5,
        },
    },

    acidosis: {
        eventId: 'acidosis',
        optimalActions: ['increaseVentilation'], // Respiratory compensation
        requiredSubstances: {
            pH: { min: 7.35 },
            pCO2: { max: 45 },
        },
        bonus: {
            pH: 0.05,
            energy: 5,
        },
        penalty: {
            pH: -0.05,
            lactate: 2,
        },
    },

    hypoxia: {
        eventId: 'hypoxia',
        optimalActions: ['increaseVentilation', 'releaseAdrenaline'],
        requiredSubstances: {
            bloodOxygen: { min: 92 },
            pO2: { min: 85 },
        },
        bonus: {
            bloodOxygen: 5,
            brainPerfusion: 10,
        },
        penalty: {
            lactate: 3,
            nfkb: 10, // Inflammatory response
        },
    },

    inflammation: {
        eventId: 'inflammation',
        optimalActions: ['antiInflammatory', 'reduceCortisol', 'vasodilation'],
        requiredSubstances: {
            nfkb: { max: 40 },
            crp: { max: 5 },
        },
        bonus: {
            nrf2: 15, // Antioxidant response
            crp: -2,
        },
        penalty: {
            nfkb: 10,
            esr: 5,
        },
    },

    dehydration: {
        eventId: 'dehydration',
        optimalActions: ['hydrationBoost', 'vasodilation'],
        requiredSubstances: {
            heartRate: { max: 90 },
            osmolarity: { max: 300 },
        },
        bonus: {
            energy: 10,
            stress: -10,
        },
        penalty: {
            heartRate: 8,
            stress: 10,
        },
    },

    coldExposure: {
        eventId: 'coldExposure',
        optimalActions: ['thermoregulation', 'releaseAdrenaline', 'releaseGlucose'],
        requiredSubstances: {
            temperature: { min: 36.5 },
            energy: { min: 50 },
        },
        bonus: {
            energy: 15,
            temperature: 0.3,
        },
        penalty: {
            energy: -15,
            temperature: -0.2,
        },
    },

    heatStress: {
        eventId: 'heatStress',
        optimalActions: ['thermoregulation', 'vasodilation', 'hydrationBoost'],
        requiredSubstances: {
            temperature: { max: 37.5 },
        },
        bonus: {
            temperature: -0.3,
            stress: -10,
        },
        penalty: {
            temperature: 0.2,
            stress: 10,
        },
    },

    anaemiaEpisode: {
        eventId: 'anaemiaEpisode',
        optimalActions: ['oxygenationBoost', 'increaseVentilation'],
        requiredSubstances: {
            bloodOxygen: { min: 92 },
            heartRate: { max: 100 },
        },
        bonus: {
            bloodOxygen: 5,
            energy: 10,
        },
        penalty: {
            heartRate: 10,
            energy: -15,
        },
    },

    kidneyStrain: {
        eventId: 'kidneyStrain',
        optimalActions: ['renalSupport', 'hydrationBoost'],
        requiredSubstances: {
            creatinine: { max: 1.2 },
            gfr: { min: 80 },
        },
        bonus: {
            stress: -15,
            energy: 10,
        },
        penalty: {
            stress: 15,
            creatinine: 0.3,
        },
    },

    liverOverload: {
        eventId: 'liverOverload',
        optimalActions: ['detoxification', 'metabolicSwitch'],
        requiredSubstances: {
            alt: { max: 40 },
            ast: { max: 40 },
        },
        bonus: {
            energy: 15,
            stress: -15,
        },
        penalty: {
            stress: 15,
            alt: 10,
        },
    },
};// Combo system - special bonuses for action combinations
export interface ActionCombo {
    name: string;
    actionIds: string[];
    timeWindow: number; // seconds within which actions must be performed
    bonus: {
        [key: string]: number;
    };
    description: string;
}

export const ACTION_COMBOS: ActionCombo[] = [
    {
        name: 'Resposta de Emergência',
        actionIds: ['releaseAdrenaline', 'increaseVentilation'],
        timeWindow: 5,
        bonus: {
            heartRate: 10,
            bloodOxygen: 5,
            brainPerfusion: 15,
        },
        description: '⚡ Boost cardiovascular de emergência!',
    },
    {
        name: 'Otimização Metabólica',
        actionIds: ['releaseGlucose', 'releaseInsulin'],
        timeWindow: 10,
        bonus: {
            mtor: 20,
            energy: 15,
            musclePerfusion: 10,
        },
        description: '💪 Estado anabólico aprimorado!',
    },
    {
        name: 'Maestria do Estresse',
        actionIds: ['reduceCortisol', 'vasodilation'],
        timeWindow: 8,
        bonus: {
            serotonin: 15,
            dopamine: 10,
            stress: -20,
        },
        description: '🧘 Calma perfeita alcançada!',
    },
    {
        name: 'Performance Atlética',
        actionIds: ['releaseAdrenaline', 'releaseGlucose', 'increaseVentilation'],
        timeWindow: 10,
        bonus: {
            vo2Max: 5,
            energy: 20,
            testosterone: 10,
            musclePerfusion: 15,
        },
        description: '🏃‍♂️ Performance atlética máxima!',
    },
    {
        name: 'Protocolo de Recuperação',
        actionIds: ['reduceCortisol', 'releaseGlucose', 'vasodilation'],
        timeWindow: 15,
        bonus: {
            energy: 25,
            growthHormone: 15,
            serotonin: 10,
            stress: -15,
        },
        description: '💤 Modo de recuperação ótimo!',
    },
];

// Function to evaluate if an action helps resolve an event
export function evaluateActionForEvent(
    actionId: string,
    eventId: string,
    currentParameters: any
): {
    isOptimal: boolean;
    effectiveness: number; // 0-1 scale
    feedback: string;
} {
    const solution = EVENT_SOLUTIONS[eventId];

    if (!solution) {
        return {
            isOptimal: false,
            effectiveness: 0.5,
            feedback: 'Unknown event',
        };
    }

    const isOptimal = solution.optimalActions.includes(actionId);

    // Check substance requirements
    let meetsRequirements = true;
    if (solution.requiredSubstances) {
        for (const [substance, limits] of Object.entries(solution.requiredSubstances)) {
            const value = currentParameters[substance];
            if (limits.min !== undefined && value < limits.min) {
                meetsRequirements = false;
            }
            if (limits.max !== undefined && value > limits.max) {
                meetsRequirements = false;
            }
        }
    }

    let effectiveness = isOptimal ? 0.9 : 0.4;
    if (meetsRequirements) {
        effectiveness += 0.1;
    } else {
        effectiveness -= 0.2;
    }

    let feedback = '';
    if (isOptimal && meetsRequirements) {
        feedback = '✅ Ação ótima! Evento sendo resolvido eficientemente.';
    } else if (isOptimal && !meetsRequirements) {
        feedback = '⚠️ Boa ação, mas parâmetros não ideais.';
    } else {
        feedback = '❌ Esta ação pode não ser ótima para este evento.';
    }

    return {
        isOptimal,
        effectiveness: Math.max(0, Math.min(1, effectiveness)),
        feedback,
    };
}

// Function to check for combo activation
export function checkForCombo(
    recentActions: Array<{ actionId: string; timestamp: number }>,
    currentTime: number
): ActionCombo | null {
    for (const combo of ACTION_COMBOS) {
        // Get actions within time window
        const relevantActions = recentActions.filter(
            (a) => currentTime - a.timestamp <= combo.timeWindow
        );

        // Check if all combo actions are present
        const hasAllActions = combo.actionIds.every((requiredId) =>
            relevantActions.some((a) => a.actionId === requiredId)
        );

        if (hasAllActions) {
            return combo;
        }
    }

    return null;
}
