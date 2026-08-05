import type { CellularDamage, CellularEvent } from './cellularTypes';

export type CellularDamageKey = 'oxidativeStress' | 'membrane' | 'proteins' | 'dna';

interface DamageMarkerDefinition {
    key: CellularDamageKey;
    label: string;
    thresholds: readonly [number, number, number, number];
    consequence: string;
}

const DAMAGE_MARKERS: readonly DamageMarkerDefinition[] = [
    {
        key: 'oxidativeStress',
        label: 'Estresse oxidativo',
        thresholds: [15, 35, 60, 80],
        consequence: 'a pressão redox consome antioxidantes e amplia lesão molecular',
    },
    {
        key: 'membrane',
        label: 'Dano de membrana',
        thresholds: [8, 25, 50, 75],
        consequence: 'a barreira e os gradientes iônicos perdem estabilidade',
    },
    {
        key: 'proteins',
        label: 'Dano proteico',
        thresholds: [8, 25, 50, 75],
        consequence: 'enzimas e estruturas acumulam perda funcional',
    },
    {
        key: 'dna',
        label: 'Dano ao DNA',
        thresholds: [8, 25, 50, 75],
        consequence: 'reparo genômico e compromisso apoptótico são recrutados',
    },
];

const LEVEL_LABELS = ['controlado', 'compensatório', 'estabelecido', 'grave', 'crítico'] as const;

function damageLevel(value: number, thresholds: DamageMarkerDefinition['thresholds']) {
    return thresholds.reduce((level, threshold) => value >= threshold ? level + 1 : level, 0);
}

export function getCellularDamageBurden(damage: CellularDamage) {
    return (
        damage.oxidativeStress * .3
        + damage.membrane * .25
        + damage.proteins * .25
        + damage.dna * .2
    );
}

export function getDominantCellularDamage(damage: CellularDamage) {
    const marker = DAMAGE_MARKERS.reduce((dominant, candidate) => (
        damage[candidate.key] > damage[dominant.key] ? candidate : dominant
    ));
    return { key: marker.key, label: marker.label, value: damage[marker.key] };
}

/**
 * Traduz mudanças quantitativas dos quatro eixos de dano em eventos clínicos.
 * Mudanças pequenas permanecem nos gráficos; a timeline recebe transições de
 * faixa ou variações agudas, evitando um novo evento a cada tick de 250 ms.
 */
export function deriveCellularDamageEvents(
    previous: CellularDamage,
    current: CellularDamage,
): CellularEvent[] {
    const burden = getCellularDamageBurden(current);

    return DAMAGE_MARKERS.flatMap(marker => {
        const before = previous[marker.key];
        const after = current[marker.key];
        const delta = after - before;
        const beforeLevel = damageLevel(before, marker.thresholds);
        const afterLevel = damageLevel(after, marker.thresholds);
        const crossedLevel = beforeLevel !== afterLevel;
        const acuteChange = Math.abs(delta) >= 5;
        if ((!crossedLevel && !acuteChange) || Math.abs(delta) < .05) return [];

        const worsening = delta > 0;
        const levelLabel = LEVEL_LABELS[afterLevel];
        const message = worsening
            ? `${marker.label} aumentou para ${after.toFixed(1)}% (${levelLabel}); ${marker.consequence}. Carga molecular acumulada: ${burden.toFixed(1)}%.`
            : `${marker.label} diminuiu para ${after.toFixed(1)}% (${levelLabel}); o reparo reduziu a lesão, com ${after.toFixed(1)}% de dano residual. Carga molecular acumulada: ${burden.toFixed(1)}%.`;

        return [{
            message,
            severity: worsening && afterLevel >= 3
                ? 'critical' as const
                : worsening
                    ? 'warning' as const
                    : 'info' as const,
            affectedSystems: [
                'cellular-damage',
                marker.key,
                worsening ? 'worsening' : 'recovery',
                levelLabel,
            ],
        }];
    });
}
