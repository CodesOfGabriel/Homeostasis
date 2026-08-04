export interface ScenarioNarrativeState {
    previousScenarioId: string | null;
    lastScenarioId: string | null;
    activeTags: string[];
    chapter: number;
}

export interface ScenarioNarrativeDefinition {
    eyebrow: string;
    scene: string;
    objective: string;
    tags: readonly string[];
    conflictsWith?: readonly string[];
    follows?: readonly string[];
}

const NARRATIVES: Record<string, ScenarioNarrativeDefinition> = {
    'stair-climb': {
        eyebrow: 'Fim de tarde · prédio sem elevador',
        scene: 'O humano chegou ao prédio e encontrou o elevador parado. Subiu vários lances carregando uma mochila; as pernas queimam e a respiração ainda não acompanhou a demanda.',
        objective: 'Faça entrega, ventilação e metabolismo convergirem antes que lactato e déficit de ATP dominem o músculo.',
        tags: ['active', 'recent-exercise'],
        conflictsWith: ['major-trauma', 'sedentary-chronic'],
    },
    'meal-surge': {
        eyebrow: 'Almoço de domingo · sobremesa repetida',
        scene: 'Depois de uma refeição rica em carboidratos, glicose chega ao sangue mais rápido do que o tecido consegue armazenar e oxidar com segurança.',
        objective: 'Distribua o excesso de substrato sem criar glicotoxicidade, saturação dos pools ou pressão redox.',
        tags: ['fed', 'daily-life'],
        conflictsWith: ['fasting', 'major-trauma'],
    },
    'morning-fast': {
        eyebrow: 'Manhã corrida · café da manhã ignorado',
        scene: 'O humano saiu cedo e ainda não comeu. O glicogênio hepático está sendo solicitado e o organismo precisa decidir quando trocar glicose por gordura.',
        objective: 'Preserve glicose para tecidos dependentes e sustente ATP sem exagerar cetonas ou consumo de O₂.',
        tags: ['fasting', 'daily-life'],
        conflictsWith: ['fed', 'major-trauma'],
    },
    'micro-injury': {
        eyebrow: 'Horas após esforço · fibras em reparo',
        scene: 'A atividade anterior deixou microlesões musculares. A inflamação local é útil, mas começa a disputar ATP e aminoácidos com a manutenção celular.',
        objective: 'Permita reparo proporcional sem transformar uma resposta local em catabolismo e dano persistentes.',
        tags: ['recovery', 'recent-exercise'],
        conflictsWith: ['sedentary-chronic'],
        follows: ['stair-climb', 'fasted-workout-free-fatty-acids'],
    },
    'immune-challenge': {
        eyebrow: 'Pequeno corte · defesa em alerta',
        scene: 'Um corte aparentemente banal contaminou o tecido. Temperatura, ROS e consumo de ATP começam a subir enquanto a barreira tenta conter o foco.',
        objective: 'Sustente a defesa sem permitir que a própria resposta oxidativa destrua o tecido saudável.',
        tags: ['infection', 'illness'],
        conflictsWith: ['major-trauma'],
    },
    'heat-dehydration': {
        eyebrow: 'Calor após esforço · água ficando curta',
        scene: 'O humano continuou ativo em um ambiente quente. Suor, vasodilatação cutânea e perda de volume agora competem com perfusão e controle térmico.',
        objective: 'Conserve volume e dissipe calor antes que pressão, eletrólitos e volume celular se desorganizem.',
        tags: ['dehydration', 'recent-exercise', 'heat'],
        conflictsWith: ['sedentary-chronic', 'water-overload'],
        follows: ['stair-climb', 'fasted-workout-free-fatty-acids'],
    },
    'orthostatic-transition': {
        eyebrow: 'Mudança brusca de posição · visão escurecendo',
        scene: 'Ao levantar rapidamente, parte do volume deslocou-se para os membros inferiores. A perfusão cerebral caiu antes de o barorreflexo completar a compensação.',
        objective: 'Recupere pressão e perfusão sem criar uma descarga autonômica maior que a necessidade.',
        tags: ['hypoperfusion', 'daily-life'],
        conflictsWith: ['active-training'],
    },
    'hypercapnic-challenge': {
        eyebrow: 'Ambiente abafado · ventilação insuficiente',
        scene: 'A ventilação alveolar caiu enquanto CO₂ continuou sendo produzido. O humano sente sonolência e cefaleia antes que a oxigenação revele toda a gravidade.',
        objective: 'Diferencie retenção de CO₂ de simples ansiedade e corrija a causa gasométrica.',
        tags: ['respiratory-stress', 'daily-life'],
        conflictsWith: ['active-training'],
    },
    'acute-water-load': {
        eyebrow: 'Hidratação excessiva · correção passou do ponto',
        scene: 'Tentando se hidratar rapidamente, o humano ingeriu água em excesso. O sódio começou a diluir e a água atravessa para o intracelular.',
        objective: 'Recupere osmolaridade sem inverter o problema para desidratação e hipernatremia.',
        tags: ['water-overload', 'recovery'],
        conflictsWith: ['dehydration', 'major-hemorrhage'],
        follows: ['heat-dehydration'],
    },
    'nocturnal-hypoglycemia': {
        eyebrow: 'Madrugada · reserva de glicose esgotando',
        scene: 'Durante o sono, a glicose caiu depois de muitas horas sem ingestão. O despertar autonômico é a última barreira antes da neuroglicopenia.',
        objective: 'Mobilize glicose sem retirar ainda mais substrato da circulação.',
        tags: ['fasting', 'sleep', 'hypoglycemia'],
        conflictsWith: ['fed'],
        follows: ['morning-fast', 'whisky-party-hepatic-overload'],
    },
    'mitochondrial-uncoupling': {
        eyebrow: 'Treino continua · termogênico sem procedência',
        scene: 'Tentando sustentar o treino, o humano tomou um termogênico de procedência duvidosa. A cadeia respiratória acelera e consome O₂, mas o gradiente escapa como calor e ATP continua caindo.',
        objective: 'Reconheça desacoplamento: reduza demanda e contenha ROS antes de tentar produzir ainda mais potência.',
        tags: ['toxic-exposure', 'mitochondrial-stress'],
        conflictsWith: ['major-trauma'],
        follows: ['fasted-workout-free-fatty-acids'],
    },
    'mixed-ketoacidotic-fatigue': {
        eyebrow: 'Viagem longa · insulina esquecida',
        scene: 'O humano passou horas sem a correção habitual de insulina. Cetonas e ânion gap sobem; agora a musculatura respiratória começa a falhar na compensação.',
        objective: 'Interrompa a fonte metabólica de ácido sem perder a remoção respiratória de CO₂.',
        tags: ['metabolic-crisis', 'dehydration'],
        conflictsWith: ['fed', 'recent-exercise'],
    },
    'distributive-dysoxia': {
        eyebrow: 'Ferida infectada · deterioração silenciosa',
        scene: 'Um ferimento mal cuidado evoluiu durante o dia. O sangue ainda carrega O₂, mas vasoplegia e heterogeneidade microcirculatória impedem que o tecido o transforme em ATP.',
        objective: 'Não se deixe tranquilizar pela SpO₂: recupere perfusão e preserve a defesa contra o foco.',
        tags: ['infection', 'shock', 'illness'],
        conflictsWith: ['active-training'],
        follows: ['immune-challenge'],
    },
    'reperfusion-paradox': {
        eyebrow: 'Após controle do choque · sangue volta ao tecido',
        scene: 'A circulação foi parcialmente restaurada depois de um período de isquemia. O retorno de O₂ encontra mitocôndrias reduzidas e dispara Ca²⁺ e ROS.',
        objective: 'Module a reperfusão e o pico redox antes de priorizar potência ou reconstrução.',
        tags: ['trauma-recovery', 'reperfusion'],
        conflictsWith: ['sedentary-chronic', 'social-night'],
        follows: ['major-hemorrhage'],
    },
    'hyperosmolar-renal-conflict': {
        eyebrow: 'Turno prolongado · sede ignorada',
        scene: 'O humano passou horas trabalhando, urinando e sem repor água adequadamente. Glicose e osmolaridade mantêm a diurese enquanto a filtração renal recua.',
        objective: 'Interrompa a causa osmótica e conserve volume sem interpretar o K⁺ plasmático isoladamente.',
        tags: ['dehydration', 'metabolic-crisis'],
        conflictsWith: ['water-overload', 'active-training'],
    },
    'whisky-party-hepatic-overload': {
        eyebrow: 'Festa · alguns copos de whisky',
        scene: 'O humano bebeu vários copos de whisky sem comer direito. O fígado prioriza oxidar etanol, acumula NADH e perde capacidade de sustentar glicose enquanto lactato e ROS sobem.',
        objective: 'Proteja glicose, cérebro e estado redox antes que a depressão metabólica evolua para coma.',
        tags: ['social-night', 'alcohol-exposure', 'fasting'],
        conflictsWith: ['active-training', 'sedentary-chronic', 'major-trauma'],
    },
    'alcohol-nocturnal-hypoglycemia': {
        eyebrow: 'Horas depois da festa · difícil de despertar',
        scene: 'O humano adormeceu depois da festa. O glicogênio está curto, a gliconeogênese segue limitada pelo excesso de NADH e a ventilação diminuiu enquanto a glicose cerebral continua caindo.',
        objective: 'Recupere combustível e ventilação sem aumentar ainda mais a demanda cardíaca e hepática.',
        tags: ['social-night', 'alcohol-exposure', 'fasting', 'hypoglycemia', 'sleep'],
        conflictsWith: ['active-training', 'sedentary-chronic', 'major-trauma'],
        follows: ['whisky-party-hepatic-overload'],
    },
    'fasted-workout-free-fatty-acids': {
        eyebrow: 'Academia cedo · treino em jejum',
        scene: 'O humano começou um treino intenso sem comer. Ácidos graxos livres aumentaram, mas glicose, O₂ e capacidade de oxidação não acompanham a demanda muscular.',
        objective: 'Mobilize e oxide o combustível certo sem deixar glicemia, perfusão ou ATP caírem até o desmaio.',
        tags: ['active-training', 'recent-exercise', 'fasting'],
        conflictsWith: ['sedentary-chronic', 'fed', 'major-trauma'],
    },
    'chronic-anxiety-sedentary': {
        eyebrow: 'Semanas parado · alerta que não desliga',
        scene: 'O humano está ansioso e sedentário há muito tempo. Simpático e cortisol permanecem elevados mesmo em repouso; FC, pressão e demanda de O₂ cobram uma conta cumulativa.',
        objective: 'Desative o falso estado de emergência sem derrubar perfusão ou mascarar uma alteração gasométrica real.',
        tags: ['sedentary-chronic', 'chronic-stress'],
        conflictsWith: ['recent-exercise', 'active-training', 'major-trauma'],
    },
    'panic-hyperventilation': {
        eyebrow: 'Noite seguinte · crise no sofá',
        scene: 'O alerta crônico virou uma crise aguda. O humano hiperventila parado no sofá, sente formigamento e tontura; a SpO₂ está preservada, mas PaCO₂ e perfusão cerebral caíram.',
        objective: 'Reconheça alcalose respiratória e retire o drive de alerta sem tratar como hipóxia verdadeira.',
        tags: ['sedentary-chronic', 'chronic-stress', 'panic', 'hypocapnia'],
        conflictsWith: ['recent-exercise', 'active-training', 'major-trauma'],
        follows: ['chronic-anxiety-sedentary'],
    },
    'major-hemorrhage': {
        eyebrow: 'Acidente · hemorragia importante',
        scene: 'O humano sofreu um acidente e está perdendo muito sangue. Taquicardia tenta preservar débito, mas PAM, perfusão tecidual, PO₂ e ATP caem rapidamente.',
        objective: 'Ganhe tempo fisiológico centralizando perfusão e conservando volume enquanto o sangramento é controlado.',
        tags: ['major-trauma', 'major-hemorrhage', 'shock'],
        conflictsWith: ['active-training', 'sedentary-chronic', 'social-night'],
    },
};

const FALLBACK_NARRATIVE: ScenarioNarrativeDefinition = {
    eyebrow: 'Linha fisiológica em andamento',
    scene: 'O quadro anterior evoluiu e um novo desequilíbrio tornou-se mensurável em mais de uma escala.',
    objective: 'Cruze sistema, tecido, célula e mitocôndria antes de escolher a intervenção.',
    tags: ['continuity'],
};

export function createInitialScenarioNarrativeState(): ScenarioNarrativeState {
    return { previousScenarioId: null, lastScenarioId: null, activeTags: [], chapter: 0 };
}

export function getScenarioNarrative(id: string): ScenarioNarrativeDefinition {
    return NARRATIVES[id] ?? FALLBACK_NARRATIVE;
}

export function isScenarioNarrativelyCompatible(id: string, state: ScenarioNarrativeState): boolean {
    const candidate = getScenarioNarrative(id);
    const previous = state.lastScenarioId ? getScenarioNarrative(state.lastScenarioId) : null;
    const candidateRejectsPrevious = (candidate.conflictsWith ?? []).some(tag => state.activeTags.includes(tag));
    const previousRejectsCandidate = (previous?.conflictsWith ?? []).some(tag => candidate.tags.includes(tag));
    return !candidateRejectsPrevious && !previousRejectsCandidate;
}

export function isDirectNarrativeContinuation(id: string, previousId: string | null): boolean {
    if (!previousId) return false;
    return getScenarioNarrative(id).follows?.includes(previousId) ?? false;
}

export function narrativeAffinity(id: string, state: ScenarioNarrativeState): number {
    if (!state.lastScenarioId) return 1;
    if (isDirectNarrativeContinuation(id, state.lastScenarioId)) return 2.6;
    const sharedTags = getScenarioNarrative(id).tags.filter(tag => state.activeTags.includes(tag)).length;
    return 1 + Math.min(1.2, sharedTags * .35);
}

export function advanceScenarioNarrative(state: ScenarioNarrativeState, scenarioId: string): ScenarioNarrativeState {
    const narrative = getScenarioNarrative(scenarioId);
    return {
        previousScenarioId: state.lastScenarioId,
        lastScenarioId: scenarioId,
        activeTags: [...new Set(narrative.tags)],
        chapter: state.chapter + 1,
    };
}
