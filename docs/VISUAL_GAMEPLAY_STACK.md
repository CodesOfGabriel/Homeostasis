# Stack visual e de jogabilidade

## Aplicado nesta etapa

| Tecnologia | Uso no simulador | Motivo |
|---|---|---|
| Three.js | geometrias, materiais, luzes, curvas e `InstancedMesh` | base WebGL e controle de baixo nível |
| React Three Fiber | ciclo de animação com `useFrame` e cenas ligadas ao estado Zustand | integra a simulação fisiológica ao React |
| Drei | linhas de fluxo, partículas ambientais, flutuação e controles orbitais | abstrações visuais prontas e compatíveis com R3F |
| Instanced rendering | substratos e resíduos em movimento | reduz draw calls para partículas repetidas |
| Curvas Catmull–Rom | rotas vaso → célula e célula → vaso | trajetórias suaves e biologicamente legíveis |
| Geometrias procedurais | navette, reparo, organelas e moléculas | evita novos downloads de assets e permite montagem por nível |

As cenas são transparentes e preservam `cell-background.png` como contexto anatômico. Apenas a aba ativa mantém seu Canvas montado, evitando múltiplos contextos WebGL simultâneos.

## Visualizações adicionadas

- **Tecido:** a entrega capilar e a captação são populações separadas. As moléculas deixam o lúmen, atravessam o endotélio, sofrem dispersão browniana no LEC e desaparecem gradualmente; outra população nasce no LEC para atravessar a membrana. O HUD lê diretamente os saldos `available` e `captured` de glicose e aminoácidos.
- **Bicamada fosfolipídica:** cada fosfolipídio tem cabeça polar, glicerol e duas caudas hidrofóbicas voltadas para o núcleo da membrana; uma das caudas recebe a dobra de insaturação. As duas monocamadas têm composição visual assimétrica e colesterol intercalado, sem pulsação de escala.
- **Proteínas de membrana:** modelos procedurais compactos e opacos usam `0.38×` da escala-base e seguem a topologia estrutural conhecida sem competir com a escala da célula: GLUT4 com 12 hélices em dois feixes de seis; CD36 em hairpin com duas hélices, grande domínio extracelular e glicanos; LAT1 com 12 hélices ligado por dissulfeto à hélice única e ao domínio extracelular de 4F2hc; canal Kv tetrâmero com poro, cavidade e filtro de seletividade centrais. O₂ cruza a bicamada sem receptor ou canal. As legendas são pílulas mínimas; o detalhe permanece no texto acessível.
- **HUD tecidual:** eventos recentes em uma faixa horizontal; objetivo e foco em 230 px; status em 270 px; detalhe do substrato selecionado em um console compacto alinhado à direita.
- **Estados de captação:** a interface descreve o mecanismo fisiológico — gradiente favorável, oferta intersticial baixa, excesso, sobrecarga metabólica ou transportador saturado — em vez de estados genéricos como “bloqueado”.
- **Efluxo:** CO₂ sai por difusão, lactato/H⁺ por MCT4 e resíduos por exocitose, com densidade e velocidade ligadas a CO₂ tecidual, lactato, carga de resíduos e estresse oxidativo.
- **Vesículas:** endocitose por LDLR/clatrina é mostrada como rota lipídica distinta da entrada de ácido graxo livre; exocitose mostra a fusão da vesícula e a liberação de carga no LEC.
- **Moléculas:** glicose, O₂, ácido graxo, aminoácido, CO₂, lactato e resíduos têm geometrias atômicas instanciadas próprias em `0.24×` da escala-base; o desaparecimento usa uma curva contínua de dissolução em vez de corte abrupto. No LEC, os desvios laterais usam amostras gaussianas `√(2DΔt)` em passo fixo de 140 ms, coeficientes visuais dependentes do tamanho molecular e fronteiras reflexivas. A apresentação interpola essas amostras com `smootherstep`, preservando os pontos estocásticos e removendo o flicker de uma nova amostra por frame.
- **Ancoragem e profundidade:** a cena molecular usa coordenadas fixas do viewport sobre o fundo anatômico. A camada de decisão sobrepõe o vaso/tecido sem adicionar padding à aba tecidual; Canvas, rótulos moleculares, HUD e painéis ocupam níveis de profundidade separados.
- **Célula:** membrana pulsa de acordo com o potencial, núcleo e mitocôndrias têm movimento sutil.
- **Construção:** o receptor adrenérgico representa integralmente a coluna de transportadores; navette mitocondrial e complexo de reparo montam uma peça nova a cada compra.
- **Cadeia respiratória:** contadores mostram moléculas processadas em equivalentes/min; partículas de elétrons preservam sua fase e recebem novos elementos gradualmente quando o fluxo aumenta.
- **Navegação:** o stepper inferior é um overlay com fade transparente; apenas os círculos recebem brilho e o conteúdo das demais abas rola por trás da faixa.
- **Sistema:** sinais vitais e sinalização hormonal são uma única escala de observação; a barra inferior mantém apenas uma entrada para ela. Gasometria, perfusão, metabolismo e eletrólitos ficam como marcadores complementares.
- **Ritmo cardíaco:** `human_heart.glb`, ECG e o único valor de BPM ficam integrados à frequência cardíaca. O coração pulsa com a FC, pode ser rotacionado diretamente com o cursor e sobrepõe de forma controlada o canto do bloco de sinais vitais; a faixa P–QRS–T muda de velocidade sem reiniciar sua fase.
- **Monitorização clínica:** sinais vitais, gasometria, eletrólitos e metabolismo usam rótulos completos, faixas de referência, histórico e indicadores explícitos de aumento, redução ou estabilidade. FC, ventilação e retenção renal são apenas respostas observadas; o jogador atua pelos modos Hormônios e Hipotálamo da mesma central flutuante.
- **Economia das decisões:** o modal obrigatório mostra ATP, pools captados, ocupação dos transportadores, ações de preparação e requisitos `atual / mínimo`; caminhos sem recursos ficam bloqueados sem avançar a timeline.
- **Destino celular:** Defesa e Genoma são uma única etapa, com compromisso apoptótico, suscetibilidade à infecção e transições de homeostase, estresse, apoptose ou necrose.
- **Transportadores:** `adrenergic_receptor.glb` substitui a coluna procedural da bancada, permanece rigidamente ancorado no centro da base escura, sem flutuação ou rotação automática, e recebe progressivamente a cor ciano conforme o nível de automação.

## Próximas ferramentas com maior retorno

| Ferramenta | Quando usar | Prioridade |
|---|---|---:|
| glTF-Transform + Draco/Meshopt/KTX2 | comprimir `human_heart.glb` e futuros modelos | alta |
| Howler.js | sons de captação, alertas, batimento e conclusão de montagem | alta |
| XState | cenários ramificados com objetivos, falhas e cadeias de decisão | média |
| `@react-three/postprocessing` | bloom seletivo, outline e feedback de dano | média; medir GPU antes |
| `@react-three/rapier` | colisões, manipulação física ou micro-robôs controláveis | baixa no fluxo bioquímico atual |
| Blender | produzir organelas e máquinas em GLB com LODs | alta para uma futura etapa de assets |

Rapier não foi incluído nesta etapa porque as moléculas seguem vias dirigidas e não precisam de colisões. Um solver físico aumentaria o custo de CPU/WASM sem melhorar a decisão bioquímica atual.
