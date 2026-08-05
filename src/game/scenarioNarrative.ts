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
        objective: 'Reconheça a resposta fisiológica ao esforço, interrompa a carga e acompanhe recuperação de ventilação, pressão e sintomas.',
        tags: ['active', 'recent-exercise'],
        conflictsWith: ['major-trauma', 'sedentary-chronic'],
    },
    'meal-surge': {
        eyebrow: 'Almoço de domingo · sobremesa repetida',
        scene: 'Depois de uma refeição rica em carboidratos, glicose chega ao sangue mais rápido do que o tecido consegue armazenar e oxidar com segurança.',
        objective: 'Coordene insulina, atividade leve e armazenamento sem adicionar mais glicose ao estado alimentado.',
        tags: ['fed', 'daily-life'],
        conflictsWith: ['fasting', 'major-trauma'],
    },
    'morning-fast': {
        eyebrow: 'Manhã corrida · café da manhã ignorado',
        scene: 'O humano saiu cedo e ainda não comeu. O glicogênio hepático está sendo solicitado e o organismo precisa decidir quando trocar glicose por gordura.',
        objective: 'Diferencie jejum compensado de hipoglicemia sintomática e escolha quando observar ou oferecer carboidrato.',
        tags: ['fasting', 'daily-life'],
        conflictsWith: ['fed', 'major-trauma'],
    },
    'micro-injury': {
        eyebrow: 'Horas após esforço · fibras em reparo',
        scene: 'A atividade anterior deixou microlesões musculares. A inflamação local é útil, mas começa a disputar ATP e aminoácidos com a manutenção celular.',
        objective: 'Reduza a carga, avalie função e permita recuperação sem mascarar dor para continuar lesionando o tecido.',
        tags: ['recovery', 'recent-exercise'],
        conflictsWith: ['sedentary-chronic'],
        follows: ['stair-climb', 'fasted-workout-free-fatty-acids'],
    },
    'immune-challenge': {
        eyebrow: 'Pequeno corte · defesa em alerta',
        scene: 'Um corte aparentemente banal contaminou o tecido. Temperatura, ROS e consumo de ATP começam a subir enquanto a barreira tenta conter o foco.',
        objective: 'Controle o foco infeccioso e ofereça suporte sem esconder a progressão com imunossupressão isolada.',
        tags: ['infection', 'illness'],
        conflictsWith: ['major-trauma'],
    },
    'heat-dehydration': {
        eyebrow: 'Calor após esforço · água ficando curta',
        scene: 'O humano continuou ativo em um ambiente quente. Suor, vasodilatação cutânea e perda de volume agora competem com perfusão e controle térmico.',
        objective: 'Interrompa a exposição, resfrie e reponha água e eletrólitos antes da deterioração neurológica e circulatória.',
        tags: ['dehydration', 'recent-exercise', 'heat'],
        conflictsWith: ['sedentary-chronic', 'water-overload'],
        follows: ['stair-climb', 'fasted-workout-free-fatty-acids'],
    },
    'orthostatic-transition': {
        eyebrow: 'Mudança brusca de posição · visão escurecendo',
        scene: 'Ao levantar rapidamente, parte do volume deslocou-se para os membros inferiores. A perfusão cerebral caiu antes de o barorreflexo completar a compensação.',
        objective: 'Use posição e reavaliação para recuperar retorno venoso sem bloquear a taquicardia compensatória.',
        tags: ['hypoperfusion', 'daily-life'],
        conflictsWith: ['active-training'],
    },
    'hypercapnic-challenge': {
        eyebrow: 'Ambiente abafado · ventilação insuficiente',
        scene: 'A ventilação alveolar caiu enquanto CO₂ continuou sendo produzido. O humano sente sonolência e cefaleia antes que a oxigenação revele toda a gravidade.',
        objective: 'Proteja a via aérea e restaure ventilação alveolar antes de tentar mascarar a sonolência com estimulantes.',
        tags: ['respiratory-stress', 'daily-life'],
        conflictsWith: ['active-training'],
    },
    'acute-water-load': {
        eyebrow: 'Hidratação excessiva · correção passou do ponto',
        scene: 'Tentando se hidratar rapidamente, o humano ingeriu água em excesso. O sódio começou a diluir e a água atravessa para o intracelular.',
        objective: 'Suspenda água, avalie sintomas neurológicos e acompanhe sódio e diurese sem acelerar demais a correção.',
        tags: ['water-overload', 'recovery'],
        conflictsWith: ['dehydration', 'major-hemorrhage'],
        follows: ['heat-dehydration'],
    },
    'nocturnal-hypoglycemia': {
        eyebrow: 'Madrugada · reserva de glicose esgotando',
        scene: 'Durante o sono, a glicose caiu depois de muitas horas sem ingestão. O despertar autonômico é a última barreira antes da neuroglicopenia.',
        objective: 'Escolha glicose oral, dextrose IV ou glucagon conforme consciência e capacidade de deglutição.',
        tags: ['fasting', 'sleep', 'hypoglycemia'],
        conflictsWith: ['fed'],
        follows: ['morning-fast', 'whisky-party-hepatic-overload'],
    },
    'mitochondrial-uncoupling': {
        eyebrow: 'Academia · o termogênico levou o nome a sério demais',
        scene: 'O rótulo prometia “metabolismo em modo fornalha” e, infelizmente, entregou. O humano está muito quente, taquicárdico e gastando O₂ depressa, mas sua reserva de ATP continua caindo: a usina celular virou aquecedor e esqueceu de ligar o gerador.',
        objective: 'Identifique o calor sem produção de energia, suspenda o produto, resfrie e dê suporte sem somar outro estimulante à fornalha.',
        tags: ['toxic-exposure', 'mitochondrial-stress'],
        conflictsWith: ['major-trauma'],
        follows: ['fasted-workout-free-fatty-acids'],
    },
    'mixed-ketoacidotic-fatigue': {
        eyebrow: 'Viagem longa · a insulina ficou passeando na mala',
        scene: 'O humano passou horas sem a dose habitual. A glicose subiu, o corpo começou a produzir cetonas ácidas e os pulmões assumiram um plantão extra para eliminar CO₂. Só que a respiração, depois de trabalhar por dois setores, está cansando.',
        objective: 'Recupere volume, acompanhe potássio e inicie insulina com segurança sem desligar cedo demais a respiração que ainda protege o pH.',
        tags: ['metabolic-crisis', 'dehydration'],
        conflictsWith: ['fed', 'recent-exercise'],
    },
    'distributive-dysoxia': {
        eyebrow: 'Ferida infectada · o curativo perdeu a reunião',
        scene: 'O corte que parecia “coisa de cinco minutos” passou o dia sem cuidado e agora comanda uma crise sistêmica. O oxímetro continua otimista, mas a pressão cai, o lactato sobe e o tecido recebe sangue de forma irregular: número bonito no dedo, circulação ruim por dentro.',
        objective: 'Trate a infecção e o foco, recupere volume e ajuste o vasopressor pela pressão e perfusão reais, não pelo charme isolado da SpO₂.',
        tags: ['infection', 'shock', 'illness'],
        conflictsWith: ['active-training'],
        follows: ['immune-challenge'],
    },
    'reperfusion-paradox': {
        eyebrow: 'Depois do resgate · o sangue volta ao membro',
        scene: 'Após um longo período com pouca circulação, o fluxo começa a voltar ao membro esmagado. Isso salva tecido, mas também pode carregar de uma vez potássio, ácidos e moléculas oxidantes acumuladas para o coração e o restante do corpo.',
        objective: 'Prepare volume, ECG e correção de eletrólitos antes e durante a reperfusão, acompanhando ritmo, potássio, cálcio e pressão.',
        tags: ['trauma-recovery', 'reperfusion'],
        conflictsWith: ['sedentary-chronic', 'social-night'],
        follows: ['major-hemorrhage'],
    },
    'hyperosmolar-renal-conflict': {
        eyebrow: 'Turno prolongado · água sempre depois do próximo e-mail',
        scene: 'O humano passou o dia urinando muito e adiando o copo d’água. A glicose alta puxou ainda mais água para a urina; agora ele está confuso, muito desidratado e com os rins reduzindo o ritmo, como uma pia recebendo mais do que o encanamento consegue escoar.',
        objective: 'Devolva volume primeiro, acompanhe sódio, potássio, urina e consciência e só depois ajuste a insulina com segurança.',
        tags: ['dehydration', 'metabolic-crisis'],
        conflictsWith: ['water-overload', 'active-training'],
    },
    'whisky-party-hepatic-overload': {
        eyebrow: 'Festa · alguns copos de whisky',
        scene: 'O humano bebeu whisky sem jantar direito. A confiança para cantar no karaokê subiu, mas a glicose caiu: o fígado está ocupado processando álcool e deixou a produção de glicose na fila. Agora há náusea, sonolência e uma respiração que merece vigilância.',
        objective: 'Cheque via aérea, respiração, circulação e glicemia; trate a queda e use tiamina quando indicada sem apostar que café transforma fígado em máquina turbo.',
        tags: ['social-night', 'alcohol-exposure', 'fasting'],
        conflictsWith: ['active-training', 'sedentary-chronic', 'major-trauma'],
    },
    'alcohol-nocturnal-hypoglycemia': {
        eyebrow: 'Horas depois da festa · não é apenas sono pesado',
        scene: 'O humano “apagou”, mas o plantão fisiológico continua. O fígado ainda está ocupado com o álcool, a reserva de glicose encurtou e a respiração ficou superficial. O oxímetro pode demorar a protestar enquanto CO₂, sonolência e risco cerebral aumentam.',
        objective: 'Trate glicemia e ventilação ao mesmo tempo, protegendo a via aérea e reavaliando consciência, gasometria e resposta à glicose.',
        tags: ['social-night', 'alcohol-exposure', 'fasting', 'hypoglycemia', 'sleep'],
        conflictsWith: ['active-training', 'sedentary-chronic', 'major-trauma'],
        follows: ['whisky-party-hepatic-overload'],
    },
    'fasted-workout-free-fatty-acids': {
        eyebrow: 'Academia cedo · café da manhã foi substituído por coragem',
        scene: 'O humano começou um treino intenso em jejum e agora está tonto, suado e taquicárdico. A gordura chegou em caminhões ao sangue, mas o cérebro trabalha com uma catraca mais exigente e quer glicose disponível agora — não uma promessa de combustível para depois.',
        objective: 'Interrompa o treino, evite a queda e ofereça carboidrato rápido se consciência e deglutição estiverem seguras.',
        tags: ['active-training', 'recent-exercise', 'fasting'],
        conflictsWith: ['sedentary-chronic', 'fed', 'major-trauma'],
    },
    'chronic-anxiety-sedentary': {
        eyebrow: 'Semanas no sofá · toda notificação parece uma sirene',
        scene: 'O humano está sedentário, dorme mal e vive em alerta. Mesmo sem sair do sofá, coração e respiração se comportam como se uma reunião surpresa estivesse perseguindo a casa inteira. Cortisol alto e baixa variabilidade cardíaca mostram que o alarme interno não descansa.',
        objective: 'Exclua doença e substâncias e reduza o alerta aos poucos com sono, respiração, apoio e atividade progressiva, sem acrescentar estimulantes.',
        tags: ['sedentary-chronic', 'chronic-stress'],
        conflictsWith: ['recent-exercise', 'active-training', 'major-trauma'],
    },
    'panic-hyperventilation': {
        eyebrow: 'Noite seguinte · fuga de rinoceronte, mas no sofá',
        scene: 'O humano está parado, porém respira como se um rinoceronte tivesse entrado na sala. O oxigênio está cheio; o problema é que CO₂ demais foi eliminado. A queda do CO₂ contrai vasos cerebrais e ajuda a explicar tontura, formigamento e sensação de desastre iminente.',
        objective: 'Confirme estabilidade, acolha e guie uma respiração lenta sem mandar puxar mais ar nem aumentar catecolaminas.',
        tags: ['sedentary-chronic', 'chronic-stress', 'panic', 'hypocapnia'],
        conflictsWith: ['recent-exercise', 'active-training', 'major-trauma'],
        follows: ['chronic-anxiety-sedentary'],
    },
    'major-hemorrhage': {
        eyebrow: 'Acidente · hemorragia importante',
        scene: 'O humano sofreu um acidente e está perdendo muito sangue. O coração acelera para manter o fluxo, mas cada batimento recebe menos volume. Pressão, perfusão cerebral e oxigênio nos tecidos caem; aqui, o enunciado é direto porque cada minuto importa.',
        objective: 'Controle imediatamente o sangramento e ative reposição balanceada, protegendo perfusão cerebral, temperatura, cálcio e coagulação.',
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
