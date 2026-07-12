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

- **Tecido:** fluxo de glicose, O₂, ácido graxo e aminoácidos do vaso até os transportadores de membrana, com chips clicáveis ancorados nas próprias rotas.
- **Receptores:** hover/foco nos portais de membrana identifica discretamente GLUT4, difusão de O₂, CD36/FATP e LAT1.
- **HUD tecidual:** eventos recentes em uma faixa horizontal; objetivo e foco em 230 px; status em 270 px; detalhe do substrato selecionado em um console compacto alinhado à direita.
- **Estados de captação:** a interface descreve o mecanismo fisiológico — gradiente favorável, oferta intersticial baixa, excesso, sobrecarga metabólica ou transportador saturado — em vez de estados genéricos como “bloqueado”.
- **Efluxo:** resíduos e ROS retornam da célula ao vaso, com densidade e velocidade ligadas ao estado fisiológico.
- **Moléculas:** cada classe possui forma e cor próprias; ATP é representado como um pequeno agrupamento molecular.
- **Célula:** membrana pulsa de acordo com o potencial, núcleo e mitocôndrias têm movimento sutil.
- **Construção:** o receptor adrenérgico representa integralmente a coluna de transportadores; navette mitocondrial e complexo de reparo montam uma peça nova a cada compra.
- **Cadeia respiratória:** contadores mostram moléculas processadas em equivalentes/min; partículas de elétrons preservam sua fase e recebem novos elementos gradualmente quando o fluxo aumenta.
- **Navegação:** o stepper inferior é um overlay com fade transparente; apenas os círculos recebem brilho e o conteúdo das demais abas rola por trás da faixa.
- **Sistema:** sinais vitais e sinalização hormonal são uma única escala de observação; a barra inferior mantém apenas uma entrada para ela. Gasometria, perfusão, metabolismo e eletrólitos ficam como marcadores complementares.
- **Ritmo cardíaco:** `human_heart.glb`, ECG e o único valor de BPM ficam integrados à frequência cardíaca. O coração pulsa com a FC, pode ser rotacionado diretamente com o cursor e sobrepõe de forma controlada o canto do bloco de sinais vitais; a faixa P–QRS–T muda de velocidade sem reiniciar sua fase.
- **Monitorização clínica:** sinais vitais, gasometria, eletrólitos e metabolismo usam rótulos completos, faixas de referência, histórico e indicadores explícitos de aumento, redução ou estabilidade. Os controles combinam slider com botões de incremento e mostram a resposta fisiológica observada.
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
