# Homeostasis — simulador de fisiologia

Simulação biomédica educativa que conecta sinais sistêmicos, microcirculação, metabolismo celular e decisões de manutenção da homeostase em uma única interface glass.

> O simulador é um modelo educacional e de gameplay. Não é um dispositivo médico e não deve orientar diagnóstico ou tratamento.

![Interface do Homeostasis Simulator](public/images/image.png)

## O que pode ser controlado

- início, pausa, velocidades `1x`, `2x` e `4x`, reinício e navegação por escalas;
- captação de glicose, oxigênio, ácido graxo e aminoácido no tecido;
- glicólise, oxidação de piruvato, beta-oxidação e automações celulares;
- reparo de membrana, proteínas, DNA e defesas antioxidantes;
- liberação hormonal com custo, segurança e cooldown;
- ingestão de água, alvo cardíaco, drive ventilatório e reabsorção renal;
- exercício, estresse, nutrição e sono.
- cenários fisiológicos com duas respostas, consequências por atraso e adaptações variáveis explicadas pelo estado.

As quatro views — **Tecido**, **Intracelular**, **Maquinaria celular** e **Sistema** — compartilham o mesmo estado e continuam avançando na mesma timeline.

## Modelo

O estado macroscópico é calculado pelo motor fisiológico e alimenta o microambiente celular a cada tick. Eventos, warnings, dano, reparo, viabilidade e falência terminal são derivados desses motores; a interface não usa caminhada aleatória para representar dados fisiológicos. Na tela Tecido, os eventos ficam na faixa superior, os substratos são chips nos fluxos e o console inferior mostra custo, efeito e risco antes da captação.

Fórmulas, unidades, faixas e limitações estão descritas em [docs/PHYSIOLOGY_MODEL.md](docs/PHYSIOLOGY_MODEL.md).
O stack de animação, as cenas 3D aplicadas e as próximas ferramentas recomendadas estão em [docs/VISUAL_GAMEPLAY_STACK.md](docs/VISUAL_GAMEPLAY_STACK.md).

## Tecnologias

- Vite + React 18 + TypeScript
- Three.js + React Three Fiber + Drei
- Zustand
- Tailwind CSS
- Lucide React

## Executar

```bash
npm install
npm run dev
```

No Windows PowerShell, use `npm.cmd` se a política de execução bloquear `npm.ps1`.

Validação de produção:

```bash
npm run lint
npm run build
```

## Estrutura

```text
src/
├── App.tsx
├── components/Homeostasis/  # única interface do simulador
└── game/                    # motores sistêmico e celular, tipos e store

public/images/
└── cell-background.png
```

## Licença

Consulte [LICENSE](LICENSE).
