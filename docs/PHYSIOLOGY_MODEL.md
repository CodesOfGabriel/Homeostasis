# Modelo fisiológico do Homeostasis

Este documento descreve o modelo implementado no código atual, suas unidades, normalizações e limitações. O objetivo é permitir que alterações de gameplay continuem coerentes com os dois motores da aplicação:

- o motor sistêmico em [`src/game/simulationLogic.ts`](../src/game/simulationLogic.ts);
- o motor de tecido/célula em [`src/game/cellularSimulation.ts`](../src/game/cellularSimulation.ts).

> Este é um modelo educacional simplificado, não validado para decisão clínica. Faixas exibidas são referências de gameplay e triagem visual, não critérios diagnósticos.

## 1. Arquitetura e ordem do tick

O estado compartilhado é mantido pelo Zustand em [`simulationStore.ts`](../src/game/simulationStore.ts). Em cada tick:

1. o tempo real é multiplicado pela velocidade da simulação e limitado a 2 s por atualização;
2. a água pendente no trato gastrointestinal gera uma taxa de absorção;
3. `calculatePhysiologyTick` calcula o novo estado macroscópico;
4. `advanceCellularSimulation` recebe esse estado macroscópico já atualizado;
5. cooldowns, histórico, warnings e eventos são atualizados;
6. eventos celulares são convertidos em eventos fisiológicos do tipo `cellular`.

O motor sistêmico usa taxas por segundo/minuto e aproximações exponenciais:

```text
x(t + Δt) = alvo + (x(t) - alvo) × exp(-Δt / τ)
```

O motor celular subdivide cada tick em passos fixos de no máximo 0,25 s e limita uma chamada a 10 s. Isso reduz dependência da frequência de renderização em dano, ROS e consumo de ATP.

### Direção atual do acoplamento

O acoplamento fisiológico é predominantemente:

```text
estado sistêmico → tecido/LEC → LIC → mitocôndria e dano
```

Ações celulares geram feedback visual e eventos na timeline, mas o ATP, lactato e dano do voxel ainda não alteram diretamente os pools macroscópicos do organismo. Esse retorno micro → macro é uma extensão futura importante.

## 2. Estado basal

O estado inicial representa um adulto saudável de 70 kg em repouso.

| Domínio | Marcador | Basal |
|---|---|---:|
| Cardiovascular | Frequência cardíaca | 70 bpm |
| Cardiovascular | Volume sistólico | 70 mL |
| Cardiovascular | Débito cardíaco | 4,9 L/min |
| Cardiovascular | Pressão arterial | 120/80 mmHg |
| Respiratório | Frequência respiratória | 14 rpm |
| Respiratório | Volume corrente | 500 mL |
| Respiratório | Ventilação minuto | 7,0 L/min |
| Respiratório | SpO₂ | 98% |
| Respiratório | PaO₂ / PaCO₂ | 95 / 40 mmHg |
| Ácido-base | pH arterial | 7,40 |
| Ácido-base | HCO₃⁻ | 26 mmol/L |
| Metabólico | Glicemia | 90 mg/dL |
| Metabólico | Lactato | 0,8 mmol/L |
| Hídrico | Água corporal | 42 L |
| Eletrólitos | Na⁺ / K⁺ | 140 / 4,0 mmol/L |
| Energia sistêmica | ATP / capacidade | 10 / 12 mmol normalizados |
| Energia sistêmica | PCr / capacidade | 28 / 30 mmol normalizados |
| Energia sistêmica | VO₂ | 3,5 mL/kg/min |

No teste de estabilidade de 10 minutos, o motor permanece aproximadamente em FC 70, FR 14, SpO₂ 98%, PaCO₂ 40 mmHg, pH 7,40, glicose 90 mg/dL e lactato 0,8 mmol/L.

## 3. Compartimentos: sangue, LEC e LIC

### 3.1 Sangue e estado sistêmico

O estado macroscópico contém glicemia, eletrólitos, hidratação, gases arteriais, pH, débito cardíaco e demanda energética. Ele representa o reservatório que entrega fluxo ao voxel observado.

### 3.2 LEC e tecido

O **líquido extracelular (LEC)** da MICROVISTA representa o espaço intersticial entre o capilar e a membrana celular. O estado inicial e as faixas visuais são:

| Marcador LEC | Unidade | Basal | Faixa visual normal | Faixa crítica visual |
|---|---:|---:|---:|---:|
| Perfusão | % do basal | 100 | 75–115 | <40 ou >145 |
| PO₂ tecidual | mmHg | 40 | 25–55 | <10 ou >70 |
| PCO₂ tecidual | mmHg | 46 | 40–50 | <28 ou >65 |
| Glicose | mmol/L | 5,0 | 3,9–6,1 | <2,5 ou >10 |
| Lactato | mmol/L | 1,0 | 0,5–2,0 | >4 |
| pH | — | 7,38 | 7,35–7,45 | <7,10 ou >7,65 |
| Osmolaridade | mOsm/kg | 290 | 280–300 | <260 ou >320 |
| Na⁺ | mmol/L | 140 | 135–145 | <125 ou >155 |
| K⁺ | mmol/L | 4,0 | 3,5–5,0 | <2,5 ou >6,5 |
| Carga de resíduos | % normalizado | 8 | ≤35 | >65 |

Perfusão local combina débito cardíaco e pressão arterial média:

```text
razão de fluxo = débito cardíaco / 4,9
componente de pressão = √clamp(PAM / 93, 0,25, 1,8)
fator de perfusão = clamp(razão de fluxo × componente de pressão, 0,2, 1,6)
perfusão alvo = clamp(100 × fator de perfusão, 20, 160)
```

A oferta de O₂ também incorpora a SpO₂. A demanda metabólica local é a demanda sistêmica de ATP dividida pelo basal de 30 mmol/min.

```text
PO₂ tecidual alvo ≈ 40 × oferta de O₂ - penalidade de demanda
PCO₂ tecidual alvo ≈ PaCO₂ + 6 + 2 × (demanda - perfusão)
glicose LEC alvo ≈ glicemia/18 × (0,78 + 0,22 × perfusão)
```

O divisor 18 converte glicose de mg/dL para mmol/L. O pH tecidual segue o pH arterial com uma diferença basal de aproximadamente 0,02 e penalidade adicional por lactato.

### 3.3 Osmolaridade do LEC

O proxy implementado é:

```text
osmolaridade LEC ≈ 2 × [Na⁺] + glicose/18 + 5
```

O termo `+5` representa osmóis não explicitamente modelados. Ureia, proteínas, cloreto e outros solutos não possuem balanços independentes neste voxel; portanto o resultado não deve ser interpretado como osmolaridade laboratorial calculada completa.

### 3.4 LIC

O **líquido intracelular (LIC)** acompanha gradientes, volume e energia da célula observada.

| Marcador LIC | Unidade | Basal | Faixa visual normal | Alerta/crítico |
|---|---:|---:|---:|---:|
| pH | — | 7,20 | 7,00–7,30 | crítico <6,70 ou >7,55 |
| Osmolaridade | mOsm/kg | 290 | 280–300 | crítico <255 ou >325 |
| Volume | % do basal | 100 | 95–105 | crítico <82 ou >118 |
| Potencial de membrana | mV | -70 | -90 a -60 | crítico fora de -105 a -40 |
| Na⁺ | mmol/L | 12 | 8–18 | crítico <3 ou >35 |
| K⁺ | mmol/L | 140 | 120–155 | crítico <90 ou >175 |
| Ca²⁺ citosólico | nM | 100 | 70–150 | crítico <30 ou >500 |
| ATP | mmol/L normalizado | 5,0 | ≥2,2 | alerta <2,2; crítico <1,2 |
| ADP | mmol/L normalizado | 1,0 | — | limite interno 0,35–5,5 |
| Viabilidade | % | 100 | ≥80 | alerta <80; crítico <50 |

O LIC aproxima a osmolaridade do LEC com constante de tempo de 18 s. O volume celular responde inversamente à osmolaridade externa:

```text
volume alvo (%) = clamp(100 × 290 / osmolaridade LEC, 82, 120)
```

Essa relação representa deslocamento de água, mas não resolve separadamente permeabilidade de membrana, osmóis intracelulares impermeantes ou coeficientes de reflexão.

## 4. Água, rim e sódio

### 4.1 Ingestão e absorção

Os botões da interface adicionam 250 ou 500 mL ao reservatório gastrointestinal. O reservatório aceita no máximo 2.000 mL pendentes.

```text
absorção gastrointestinal = min(16, água pendente × 0,08) mL/min
```

A água não entra instantaneamente na água corporal total.

### 4.2 GFR e reabsorção

O motor usa uma taxa de filtração glomerular fixa de 125 mL/min:

```text
fluxo urinário = 125 × (1 - reabsorção/100) mL/min
```

A interface limita a reabsorção a 98,5–99,8%; o clamp defensivo interno é 95–99,9%. O basal da interface é 99,2%.

### 4.3 Balanço de água

```text
perda por suor = 0,2 + 8 × exercício + 3 × carga térmica   [mL/min]
perda insensível = 0,6 mL/min

Δágua corporal =
    (absorção - urina - perda insensível - suor) × Δt / 1000
```

`exercício` é uma fração entre 0 e 1. A carga térmica começa acima de 26 °C. A água corporal é limitada a 28–55 L.

### 4.4 Concentração de Na⁺

Em curto prazo o modelo conserva aproximadamente a massa de Na⁺ e altera sua concentração conforme a água corporal:

```text
Na⁺ diluído = Na⁺ anterior × água anterior / água atual
```

Depois, um controlador renal lento aproxima o valor de 140 mmol/L com constante de 12 h. Não há, nesta versão, balanço explícito de ingestão de sal, aldosterona, ADH, segmentos do néfron ou osmolaridade medular.

## 5. Energia sistêmica

### 5.1 Demanda

O basal normalizado é 30 mmol ATP/min para TMB de repouso.

```text
f_exercício = clamp(intensidade / 100, 0, 1)
multiplicador de atividade = 1 + 3,5 × f_exercício^1,35
custo alostático = TMB × 0,12 × max(carga - 10, 0) / 90
demanda de ATP = 30 × gasto total / TMB
```

### 5.2 Prioridade oxidativa, glicólise e PCr

A fração oxidativa desejada é aproximadamente 96% no repouso e cai progressivamente com esforço intenso:

```text
fração oxidativa = clamp(0,96 - 0,24 × f_exercício^1,7, 0,68, 0,98)
```

A capacidade aeróbia depende de VO₂máx, SpO₂ e disponibilidade de glicose. A PCr cobre até 65% do aumento súbito de demanda, limitada ao estoque. A glicólise cobre a demanda restante dentro de sua capacidade; ATP livre cobre apenas o déficit instantâneo residual.

O pool de ATP procura 82% da capacidade com constante de recuperação de 20 s. A recuperação da PCr usa capacidade aeróbia excedente e uma escala de aproximadamente 0,5 min.

### 5.3 Lactato

Há uma produção basal contínua e produção adicional quando o fluxo glicolítico supera 4% da demanda. O clearance aumenta com a concentração e com a disponibilidade de O₂.

```text
produção ≈ 0,012 + 0,018 × excesso glicolítico
clearance ≈ (0,012 + 0,12 × max(lactato - 0,8, 0)) × fator de O₂
```

Essas taxas são calibrações do simulador em mmol/L/min, não um modelo explícito de volumes de distribuição e ciclo de Cori.

## 6. Energia celular e estequiometria normalizada

### 6.1 Distinção entre grandezas e pacotes

O ATP citosólico é apresentado em mmol/L normalizados, com capacidade máxima de 8. Os pools `available` e `captured` usam pacotes de interação. Um pacote representa uma oportunidade de fluxo, não uma quantidade molecular absoluta.

Na bioquímica real:

- a glicólise de uma glicose produz 2 piruvatos e rendimento líquido de 2 ATP;
- a oxidação completa de glicose costuma render aproximadamente 30–32 ATP, dependendo da navette e do tecido;
- o rendimento de um ácido graxo depende do comprimento e saturação; palmitato é frequentemente estimado em cerca de 106 ATP.

O jogo comprime esses rendimentos para preservar legibilidade e evitar que uma única ação sature todo o pool.

### 6.2 Ações manuais

| Ação | Entrada normalizada | Saída/efeito |
|---|---|---|
| Captar glicose | até 1 pacote do LEC | +1 pacote de glicose no LIC |
| Captar O₂ | até 3 pacotes do LEC | +3 pacotes de O₂ no LIC |
| Captar ácido graxo | até 0,5 pacote | +0,5 pacote no LIC |
| Captar aminoácido | até 0,5 pacote | +0,5 pacote no LIC |
| Glicólise | 1 glicose captada | 2 piruvatos e +0,18 ATP de jogo |
| Oxidar piruvato | 1 piruvato + 3 O₂ | até +0,45 ATP de jogo; +1,2 pressão ROS |
| Oxidar ácido graxo | 1 ácido graxo + 6 O₂ | até +0,85 ATP de jogo, modulado por adaptação; +2,8 pressão ROS |

A oxidação exige ADP disponível e espaço no pool de ATP. O ADP é aproximado por:

```text
ADP = clamp(6 - ATP, 0,35, 5,5)
```

### 6.3 Fluxo basal

```text
produção basal de ATP = 0,0102 × fator de O₂ × saúde mitocondrial
consumo basal de ATP = 0,0098 + demanda do evento de rotina
```

As taxas são efetivamente mmol/L normalizados por segundo. O fator de O₂ deriva da PO₂ tecidual; a saúde mitocondrial deriva de ROS e dano proteico.

### 6.4 Maquinaria mitocondrial

| Marcador | Basal | Interpretação |
|---|---:|---|
| ΔΨ mitocondrial | -155 mV | potencial da membrana interna |
| Fluxo da ETC | 24% | fluxo normalizado da cadeia respiratória |
| Fluxo da ATP sintase | 0,55 u | produção normalizada |
| Consumo de O₂ | 2,5 u/min | índice normalizado |
| Saúde mitocondrial | 100% | penalizada por ROS e dano proteico |

O ATP é produzido pela ATP sintase a partir de ADP + Pi usando o gradiente de prótons. A “navette mitocondrial” automatizada representa encaminhamento de equivalentes redutores, ADP e substratos; não representa vesículas transportando ATP para dentro da mitocôndria.

A interface da cadeia respiratória recebe do motor taxas normalizadas de piruvato, ácido graxo, NADH, FADH₂, O₂, H⁺, ADP + Pi, ATP e H₂O. Uma oxidação manual cria um pulso de processamento que decai suavemente para o fluxo automático; por isso os contadores e elétrons animados aumentam sem reiniciar a trajetória já em curso. NADH/FADH₂ e prótons são equivalentes estequiométricos de gameplay derivados do substrato oxidado, não medições clínicas.

## 7. Gases, ventilação e ácido-base

### 7.1 Ventilação

O drive ventilatório da interface varia de 50–180%. O alvo respiratório também recebe feedback de PaCO₂, pH e exercício.

```text
FR alvo ≈ 14 × drive + exercício + feedback de CO₂ + feedback de pH
volume corrente alvo ≈ 500 × drive^0,3 + 750 × exercício
ventilação alveolar = FR × max(volume corrente - espaço morto, 50) / 1000
```

Os clamps são 5–55 rpm e 280–2.200 mL.

### 7.2 PaCO₂, PaO₂ e SpO₂

```text
PaCO₂ alvo = 40 × (VCO₂ / 200) × (4,9 / ventilação alveolar)

PAO₂ = FiO₂ × (Patm - PH₂O) - PaCO₂ / R
PaO₂ ≈ PAO₂ - 5 mmHg
```

O modelo usa FiO₂ 0,21, Patm 760 mmHg, PH₂O 47 mmHg e R 0,8. A SpO₂ é derivada de uma curva de Hill com P50 de 26,8 mmHg e coeficiente 3.

### 7.3 Henderson–Hasselbalch

```text
pH = 6,1 + log10(HCO₃⁻ / (0,03 × PaCO₂))
```

HCO₃⁻ é limitado a 8–45 mmol/L e responde lentamente a lactato, déficit energético e compensação respiratória crônica. O ânion gap usa cloreto estimado, pois Cl⁻ não possui estado independente.

## 8. Controle cardiovascular

O alvo cronotrópico da interface é um comando, não a frequência observada. A FC final também incorpora exercício, estresse acima do basal, adrenalina, hipovolemia e déficit energético.

```text
FC observada → alvo por aproximação exponencial com τ de 6–12 s
débito cardíaco = FC × volume sistólico / 1000
```

O volume sistólico depende de hidratação, exercício e tempo de enchimento. A resistência vascular cai com exercício e sobe com estresse, catecolaminas e hipovolemia. A pressão usa débito e resistência normalizados em torno de PAM 93 mmHg.

## 9. Hormônios e glicemia

Cada hormônio relaxa para um valor basal usando meia-vida própria. Uma ação hormonal distribui `amount` durante `totalDuration`; ela não reaplica a dose inteira a cada frame.

Para uma concentração `C`, basal `C₀`, constante de eliminação `k` e infusão `r`, o motor usa a forma analítica equivalente a:

```text
dC/dt = -k(C - C₀) + r
```

A glicemia combina:

- retorno passivo a 90 mg/dL em escala de 15 min;
- oferta nutricional;
- produção hepática estimulada por glucagon/adrenalina;
- captação estimulada por insulina e exercício;
- armazenamento e mobilização de glicogênio.

O modelo não resolve receptores, GLUTs específicos por tecido, resistência insulínica ou farmacocinética individual.

## 10. ROS, dano, reparo e viabilidade

### 10.1 Geração e clearance de ROS

ROS aumentam com:

- fluxo da ETC;
- glicose LEC acima de 7 mmol/L;
- PO₂ tecidual abaixo de 25 mmHg;
- NADH elevado/pressão redox;
- eventos inflamatórios;
- oxidações manuais, especialmente de ácido graxo.

O clearance depende da capacidade antioxidante. Essa capacidade sobe quando há ATP adequado e cai sob estresse oxidativo persistente.

### 10.2 Fontes de dano

| Dano | Principais causas implementadas |
|---|---|
| Membrana | ROS >25%, volume fora de ±8%, ATP <1,5 mmol/L |
| Proteínas | ROS e pH LIC <6,9 |
| DNA | fração do dano oxidativo |
| Mitocôndria | ROS e dano proteico |

Viabilidade é calculada por uma média ponderada:

```text
dano médio = 0,35 × membrana + 0,40 × proteínas + 0,25 × DNA
viabilidade = 100 - dano médio - penalidades agudas de ATP/pH
```

### 10.3 Reparo manual

| Destino | Custo de ATP | Efeito imediato |
|---|---:|---|
| Membrana | 0,45 | -8 pontos de dano; reforça suporte de bombas |
| Proteínas | 0,50 | -7 pontos de dano |
| DNA | 0,70 | -5 pontos de dano |
| Antioxidantes | 0,35 | +10 capacidade; -4 ROS |

Cada ação preserva no mínimo 0,8 mmol/L de ATP para funções vitais.

### 10.4 Automação

Existem três sistemas, limitados ao nível 4 e a oito melhorias totais por célula:

- **transportadores:** captação automática limitada pela oferta no LEC;
- **navette mitocondrial:** oxidação automática limitada por piruvato/ácido graxo, O₂, ADP e capacidade do pool;
- **reparo:** usa ATP acima da reserva para priorizar o maior dano entre membrana, proteínas e DNA.

Os custos iniciais são 0,55, 0,70 e 0,80 ATP para transportadores, navette e reparo. Cada nível encarece sua própria receita e também exige glicose, aminoácidos ou ácidos graxos conforme a maquinaria construída. A compra preserva pelo menos 1,0 ATP.

## 11. Eventos de rotina

O primeiro cenário celular surge por volta de 15 s; após cada ativação, o próximo é agendado 48 s depois. Cada cenário oferece duas respostas com custos e compensações diferentes. Se o cronômetro terminar, uma consequência fisiológica adicional é aplicada.

| Cenário | Duração | Decisão principal | Consequência sem resposta |
|---|---:|---|---|
| Subida rápida de escadas | 28 s | via aeróbia ou glicólise rápida | queda de ATP e aumento de lactato |
| Pico após uma refeição | 30 s | processar glicose ou regular transportadores | aumento de estresse oxidativo |
| Jejum prolongado pela manhã | 26 s | oxidar gordura ou conservar energia | queda de ATP |
| Microlesão após esforço | 28 s | reparar agora ou adiar | aumento de dano proteico |
| Contato com um patógeno | 24 s | conter ROS ou intensificar a resposta | ROS e dano proteico |
| Calor e desidratação leve | 26 s | ativar bombas ou adaptar osmoticamente | alteração de volume e dano de membrana |

Os cenários também aplicam uma perturbação inicial coerente: oferta de glicose no período pós-prandial, redução de glicose no jejum, dano proteico na microlesão, ROS no desafio imune e mudança de osmolaridade/volume no calor.

O motor sistêmico gera uma avaliação periódica a cada 30 s. Eventos celulares cruzando viabilidade de 70% ou 35% geram avisos adicionais na timeline.

## 12. Recompensa variável e adaptações

A recompensa celular é semi-determinística: uma oportunidade só existe depois que o estado sustentou uma condição fisiológica concreta. A qualidade do estado (viabilidade, ATP, O₂ e ROS) aumenta a chance, mas não garante que toda janela resulte em recompensa. O evento gerado sempre informa a condição que justificou o ganho.

| Adaptação | Condição observada | Efeito por nível |
|---|---|---|
| Eficiência enzimática | homeostase global prolongada | reduz discretamente o custo basal de ATP |
| Defesa antioxidante | ROS baixo e reserva antioxidante adequada | aumenta a depuração de ROS |
| Flexibilidade metabólica | glicose e ácido graxo disponíveis com ATP estável | melhora entrega e rendimento de ácidos graxos |
| Buffer intracelular | pH estável com lactato controlado | reduz o impacto ácido do lactato |
| Tolerância à hipóxia | ATP preservado com O₂ tecidual reduzido | amplia a faixa funcional do metabolismo oxidativo |

Cada adaptação tem quatro níveis. As janelas perdem progresso quando o parâmetro sai da faixa, impedindo recompensa por mera passagem de tempo. Uma decisão expirada também bloqueia recompensa no mesmo ciclo.

## 13. Leitura clínica da interface

A aba sistêmica apresenta os dados por prioridade de decisão: primeiro frequência e ritmo cardíacos, pressão/PAM, SpO₂, frequência respiratória, perfusão e débito cardíaco; em seguida gasometria/ácido-base, lactato, glicemia, eletrólitos, água corporal e déficit energético. O modelo cardíaco, o ECG e o único valor de BPM pertencem ao mesmo bloco de frequência cardíaca, e a sinalização hormonal é uma seção dessa mesma tela — não uma aba duplicada.

O ECG é sintético e educacional. A velocidade do traçado é proporcional à frequência cardíaca do modelo; irregularidade e fibrilação alteram a forma do traçado sem representar um dispositivo diagnóstico.

## 14. Warnings e falência

Warnings sistêmicos são gerados para:

| Marcador | Faixa normal usada |
|---|---:|
| pH arterial | 7,35–7,45 |
| Glicemia | 70–100 mg/dL |
| Frequência cardíaca | 60–100 bpm |
| SpO₂ | 95–100% |
| Na⁺ | 135–145 mmol/L |
| Água corporal | 38–46 L |
| Lactato | 0,5–2,0 mmol/L |
| Déficit energético | 0–10 mmol normalizados |

Condições terminais implementadas:

- pH <6,8 ou >7,8;
- FC <20 ou >250 bpm;
- fibrilação;
- SpO₂ <55%;
- funcionalidade cerebral ou cardíaca ≤5%.

Esses limites são regras do simulador e não substituem prognóstico clínico, no qual duração, temperatura, comorbidades e suporte modificam desfechos.

## 15. Limitações conhecidas

- Um único adulto padrão de 70 kg; idade, sexo, composição corporal e doença não parametrizam todo o modelo.
- Um único voxel genérico de tecido metabolicamente ativo, sem especialização muscular, neural, hepática ou renal.
- Acoplamento micro → macro ainda restrito a eventos; os pools celulares não conservam massa com os pools sistêmicos.
- Pacotes de substrato e rendimentos de ATP são normalizados para gameplay.
- Osmolaridade usa um proxy; ureia, proteínas e cloreto não têm balanço completo.
- Rim reduzido a GFR fixa, reabsorção global de água e correção lenta de sódio.
- Sem RAAS, ADH explícito, segmentos do néfron, excreção de solutos ou função glomerular variável.
- Ácido-base não resolve todos os tampões, eletroneutralidade completa ou compensações clínicas por fórmulas específicas.
- Troca gasosa usa equação alveolar e curva de Hill simplificadas, sem shunt, V/Q regional ou hemoglobina variável.
- Pressão arterial e perfusão são relações normalizadas, não um sistema hemodinâmico fechado.
- ROS, dano, reparo e viabilidade são índices normalizados sem correspondência direta com biomarcadores laboratoriais.
- A ordem dos cenários é determinística e não representa incidência epidemiológica; apenas as oportunidades de adaptação têm variação contextual.
- O comando de FC representa drive autonômico/pacing simulado; não sugere controle voluntário direto da frequência cardíaca.

## 16. Uso educacional responsável

O modelo é útil para explorar relações causais:

- ventilação alveolar → PaCO₂ → pH;
- débito/PAM → perfusão → entrega de O₂ e substratos;
- água e reabsorção → volume corporal → Na⁺/osmolaridade;
- substrato + O₂ + ADP/Pi → ATP;
- ATP → bombas, reparo e síntese;
- fluxo metabólico → ROS → dano → necessidade de reparo.

Ele não foi calibrado contra uma coorte clínica, não produz recomendações terapêuticas e não deve ser usado como calculadora médica. Ao ampliar o modelo, preserve a distinção entre grandezas clínicas, índices normalizados e recursos de gameplay.
