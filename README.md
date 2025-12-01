# 🧠 BODY OPS - NeuroHormonal Control Simulator

**Version:** MVP 0.1  
**Tech Stack:** React + Vite + TypeScript + Zustand + Framer Motion + Tailwind CSS

---

## 🎮 About The Project

**Body Ops** is a physiological control simulator inspired by:
- 🦠 **Plague Inc** (event system & narrative)
- 🧠 **Inside Out** (controlling a body from within)
- 🏥 **Medical HUD** (vital parameters visualization)

You play as a **neuron commander** in the hypothalamus operating a control room inside the human body. Your mission: maintain homeostasis by managing neurohormonal responses to various stimuli and events.

---

## ✨ Features

### MVP Includes:
- ⚡ **Real-time Physiology Simulation**
  - Heart rate, cardiac output, blood pressure
  - Respiratory rate, blood oxygenation
  - Glucose, hormones (adrenaline, cortisol, insulin)
  - Organ perfusion (brain, heart, muscles, organs)

- 🎨 **Animated HUD**
  - Beating heart synchronized with HR
  - Blood flow circulation with particles
  - Breathing lungs with oxygenation colors
  - Body silhouette with perfusion visualization

- 🎭 **Event System**
  - Random narrative events (stress, caffeine, exercise, etc.)
  - Automatic effects on physiology
  - Plague Inc-style popup notifications

- 🧪 **Player Actions**
  - Release adrenaline
  - Reduce cortisol
  - Increase ventilation
  - Release insulin/glucose
  - Vasodilation

- 📊 **Real-time Parameters Display**
  - 10+ vital parameters
  - Warning indicators for abnormal values
  - Color-coded status

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or pnpm

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Run development server:**
```bash
npm run dev
```

3. **Open browser:**
Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🏗️ Project Structure

```
body-ops/
├── src/
│   ├── components/
│   │   └── HUD/
│   │       ├── Heart.tsx               # Animated heart SVG
│   │       ├── Circulation.tsx         # Blood flow visualization
│   │       ├── Lungs.tsx              # Breathing animation
│   │       ├── BodySilhouette.tsx     # Full body perfusion
│   │       ├── ParameterCard.tsx      # Vital parameter display
│   │       ├── EventPopup.tsx         # Event notifications
│   │       └── ActionButton.tsx       # Player action buttons
│   │
│   ├── game/
│   │   ├── simulationStore.ts         # Zustand state management
│   │   ├── physiology.ts              # Default parameters & limits
│   │   ├── events.ts                  # Event definitions
│   │   ├── actions.ts                 # Player action definitions
│   │   ├── useInterval.ts             # Simulation loop hook
│   │   └── equations/
│   │       ├── cardiac.ts             # Heart & circulation logic
│   │       ├── respiratory.ts         # Breathing & O2 logic
│   │       └── perfusion.ts           # Blood flow & metabolism
│   │
│   ├── pages/
│   │   └── Dashboard.tsx              # Main game screen
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

---

## 🎯 How It Works

### Simulation Loop

The game runs a **tick() function every 200ms** that:

1. Updates all physiological parameters using equations
2. Applies active event effects
3. Updates cooldowns
4. Generates random events
5. Triggers React re-renders for animations

### Key Systems

#### 1. **Cardiac System** (`equations/cardiac.ts`)
- Heart Rate influenced by: adrenaline, stress, oxygen, energy
- Stroke Volume affected by: adrenaline, perfusion
- Cardiac Output = HR × SV
- Blood Pressure based on CO and vasoconstriction

#### 2. **Respiratory System** (`equations/respiratory.ts`)
- Respiratory Rate responds to: oxygen levels, lactate, stress
- Blood Oxygen depends on: ventilation, cardiac output, perfusion
- Tidal Volume influenced by: adrenaline, energy

#### 3. **Perfusion System** (`equations/perfusion.ts`)
- Organ blood flow based on cardiac output
- Brain has priority (autoregulation)
- Stress diverts blood from organs to muscles
- Metabolic parameters (glucose, lactate, temperature)

### State Management (Zustand)

```typescript
interface SimulationState {
  parameters: Physiology;        // All vital signs
  activeEvents: ActiveEvent[];   // Currently active events
  actionCooldowns: ActionCooldown[]; // Action timers
  notifications: string[];       // UI notifications
  tick: () => void;             // Main simulation loop
  applyAction: (action) => void; // Execute player action
}
```

---

## 🎨 Animations

All visual components use **Framer Motion** for smooth animations:

- **Heart:** Scale animation synced to HR (duration = 60/HR)
- **Circulation:** Blood particles flowing through SVG paths using `offsetPath`
- **Lungs:** Expansion/contraction based on tidal volume and RR
- **Perfusion:** Glow opacity based on organ blood flow percentage

---

## 🧪 Events

Events are randomly triggered and modify physiology for a duration:

| Event | Effects | Duration |
|-------|---------|----------|
| 🚬 Cigarette | +HR, +Adrenaline | 20s |
| ☕ Coffee | +HR, +Energy | 25s |
| 🏃 Exercise | ++HR, ++Adrenaline, -Energy | 45s |
| ⚠️ Stress | +Cortisol, +Stress | 30s |
| 🧘 Meditation | -Stress, -Cortisol, -HR | 35s |

---

## 🕹️ Player Actions

Actions have cooldowns and energy costs:

| Action | Effects | Cooldown | Cost |
|--------|---------|----------|------|
| 💉 Release Adrenaline | +30 Adrenaline, +20 HR | 20s | 10 |
| 🧘‍♂️ Reduce Cortisol | -25 Cortisol, -20 Stress | 25s | 5 |
| 💨 Increase Ventilation | +8 RR | 15s | 5 |
| 🍬 Release Insulin | +25 Insulin | 30s | 5 |
| ⚡ Release Glucose | +20 Energy | 20s | 0 |
| 🔄 Vasodilation | -10 Stress, -5 HR | 25s | 8 |

---

## 📈 Roadmap

### MVP Checklist (Current)
- [x] Project structure & dependencies
- [x] Zustand state management
- [x] Physiological equations
- [x] Animated components (Heart, Lungs, Circulation)
- [x] Body silhouette with perfusion
- [x] Parameter cards & UI
- [x] Event system
- [x] Player actions
- [x] Dashboard layout

### Future Enhancements
- [ ] More events (hunger, sleep, injury, medication)
- [ ] Achievement system
- [ ] Score/rating based on homeostasis maintenance
- [ ] Tutorial/onboarding
- [ ] Sound effects
- [ ] Save/load game state
- [ ] Multiple difficulty levels
- [ ] Mobile responsive design

---

## 🛠️ Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Zustand** - Lightweight state management
- **Framer Motion** - Animation library
- **Tailwind CSS** - Utility-first CSS
- **SVG** - Vector graphics for organs

---

## 📚 For GitHub Copilot

This project is designed to work seamlessly with GitHub Copilot. Key patterns:

### Physiology Updates
```typescript
// Heart component: animated SVG showing heart beat based on HR.
// Beat speed = 60 / heartRate
```

### Simulation Loop
```typescript
// Each tick updates the parameters and UI animations react accordingly.
tick: () => void;
```

### State Management
```typescript
// This file manages physiology state for the Body Ops simulation.
export const useSimulationStore = create<SimulationState>(...);
```

---

## 🤝 Contributing

This is an MVP project. Contributions are welcome!

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📝 License

MIT License - feel free to use this for educational purposes.

---

## 🎓 Educational Purpose

This simulator is designed for:
- Understanding basic human physiology
- Learning about neurohormonal control
- Exploring cause-effect relationships in the body
- Having fun with science! 🧬

**Note:** This is a simplified simulation for educational/entertainment purposes and does not replace medical knowledge.

---

## 🌟 Credits

Inspired by:
- Plague Inc (Ndemic Creations)
- Inside Out (Pixar)
- Medical monitoring systems

Built with ❤️ and ⚡ by a neuron commander.

---

## 📞 Support

For questions or issues, please open an issue on GitHub.

**Enjoy operating your body! 🧠🫀🫁**
