#  Homeostasis - Simulador Fisiológico com Idle Game

Simulador fisiológico em tempo real combinado com mecânicas de idle game incremental. Controle um corpo humano através de ações hipotalâmicas enquanto constrói um império de produção de ATP.

##  Quick Start

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

##  Documentação Completa

Veja **[DOCUMENTATION.md](./DOCUMENTATION.md)** para detalhes completos sobre:
- Arquitetura e estrutura do projeto
- Sistema de simulação fisiológica (40+ parâmetros)
- Sistema Idle Game (órgãos, upgrades, prestige)
- 40+ ações hipotalâmicas categorizadas
- 20+ substâncias em 5 categorias
- Sistema de achievements (23 conquistas)
- Guia de desenvolvimento

##  Principais Features

-  **Simulação em Tempo Real**: 40+ parâmetros vitais (FC, FR, pH, glicose, etc.)
-  **Idle Game**: 6 órgãos geradores de ATP com progressão exponencial
-  **40+ Ações Neurais**: Controle hipotalâmico em 12 categorias
-  **20+ Substâncias**: Medicamentos, hormônios, estimulantes
-  **23 Achievements**: Sistema de conquistas em 5 categorias
-  **Sistema de Prestige**: Reencarnação celular com multiplicadores permanentes
-  **Conteúdo Educacional**: Baseado em fisiologia real

##  Tech Stack

- React 18 + TypeScript
- Vite + Tailwind CSS
- Zustand (state management)
- Three.js (visualização 3D)
- Framer Motion (animações)

##  Estrutura

```
src/
 game/              # Lógica (simulação + idle)
 components/HUD/    # Interface do usuário
 pages/             # Dashboard principal
 App.tsx            # Entry point
```

##  Licença

Veja arquivo LICENSE.
