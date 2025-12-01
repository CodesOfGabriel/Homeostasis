# 🚀 BODY OPS v2.0 - NEW FEATURES DOCUMENTATION

## 🎯 O que foi adicionado

### 📊 **1. HUD Médico Avançado (Estilo Sci-Fi)**

Inspirado na imagem de referência, o HUD agora apresenta:

#### **Visualizações Detalhadas de Tecidos/Órgãos:**

- **🫀 Fígado (Liver Tissue)**
  - Visualização celular dos hepatócitos
  - Vasos sanguíneos pulsantes
  - Ductos biliares
  - Métricas: Perfusão, Glicose, Detoxificação
  
- **🫘 Rins (Kidney Nephrons)**
  - Estrutura dos néfrons (glomérulo + túbulos)
  - Fluxo de filtração animado
  - Sistema coletor
  - Métricas: Perfusão, Osmolaridade, Taxa de Filtração

- **💪 Músculos Esqueléticos (Muscle Fibers)**
  - Fibras Tipo I (contração lenta, aeróbicas)
  - Fibras Tipo II (contração rápida, anaeróbicas)
  - Estriações musculares
  - Capilarização e mitocôndrias
  - Métricas: Perfusão, VO₂ max, Lactato, Taxa de Contração

- **🧠 Neurônios (Neuron Network)**
  - Corpo celular (soma) com núcleo
  - Dendritos (entradas)
  - Axônio com mielina
  - Sinapses animadas
  - Transmissão de neurotransmissores
  - Métricas: Perfusão Cerebral, Glicose, Neurotransmissores

---

### 📈 **2. Gráficos em Tempo Real (Real-Time Charts)**

Sistema de gráficos dinâmicos mostrando histórico de parâmetros:

- **Heart Rate Chart** - Últimos 50 pontos
- **Blood Oxygen Chart** - Saturação em tempo real
- **Blood Glucose Chart** - Níveis de glicemia

Recursos:
- Path animado com Framer Motion
- Grid de referência
- Indicador de valor atual pulsante
- Auto-scale para min/max

---

### 🧬 **3. Vias Moleculares (Molecular Pathways)**

Visualização de 4 vias de sinalização celular críticas:

#### **Nrf2 (Nuclear Factor Erythroid 2-Related Factor 2)**
- **Função:** Resposta antioxidante
- **Ativação:** Stress oxidativo
- **Efeitos:** Proteção celular, detoxificação

#### **mTOR (Mechanistic Target of Rapamycin)**
- **Função:** Crescimento e metabolismo
- **Ativação:** Nutrientes (glicose + insulina)
- **Efeitos:** Síntese proteica, anabolismo

#### **AMPK (AMP-Activated Protein Kinase)**
- **Função:** Sensor de energia celular
- **Ativação:** Baixa energia / baixa glicose
- **Efeitos:** Catabolismo, oxidação de gorduras

#### **NF-κB (Nuclear Factor Kappa B)**
- **Função:** Inflamação e resposta imune
- **Ativação:** Stress, dano tecidual, lactato alto
- **Efeitos:** Resposta inflamatória

Cada pathway mostra:
- Barra de ativação (0-100%)
- Código de cores (verde = saudável, amarelo = moderado, vermelho = alto)
- Indicador pulsante quando ativação > 60%
- Descrição funcional

---

### 🔬 **4. Parâmetros Fisiológicos Avançados**

#### **Novos Parâmetros Adicionados:**

- **Osmolaridade** (270-310 mOsm/L)
  - Concentração de solutos no sangue
  - Afetada por glicose e função renal

- **VO₂ Max** (20-80 mL/kg/min)
  - Capacidade aeróbica máxima
  - Aumenta com exercício
  - Indicador de condicionamento

- **pH Sanguíneo** (7.0-7.8, ideal 7.4)
  - Equilíbrio ácido-base
  - Afetado por respiração e lactato
  - Compensação respiratória automática

- **Eletrólitos:**
  - **Sódio** (125-155 mmol/L, ideal 140)
  - **Potássio** (3.0-6.0 mmol/L, ideal 4.0)
  - **Cálcio** (2.0-2.8 mmol/L, ideal 2.4)

---

### 🖱️ **5. Sistema de Detalhamento Interativo (Modal System)**

**Clique em qualquer órgão** para abrir um HUD detalhado com:

- Visualização ampliada do tecido
- Informações funcionais completas
- Métricas específicas
- Descrição educacional

Modais disponíveis:
- Fígado: Funções hepáticas
- Rins: Funções renais
- Músculos: Fisiologia muscular
- Neurônios: Funções neurais

---

## 🎨 Layout do Novo HUD

### **Organização da Tela:**

```
┌─────────────────────────────────────────────────────┐
│  HEADER: Título + Timer + Controls                  │
├─────────────────────────────────────────────────────┤
│  ROW 1: Core Vitals (6 cards)                       │
│  [HR] [Glucose] [Lactate] [VO2] [Temp] [Osmol]     │
├─────────────────────────────────────────────────────┤
│  ROW 2: Hormones & Electrolytes (6 cards)           │
│  [Cortisol] [Insulin] [Na+] [K+] [Ca++] [pH]       │
├─────────────────────────────────────────────────────┤
│  MAIN GRID (3 columns):                             │
│  │ Liver    │   Body Silhouette    │ Muscle      │ │
│  │ Kidney   │   Heart + Lungs      │ Neurons     │ │
│  │          │   Circulation        │             │ │
├─────────────────────────────────────────────────────┤
│  CHARTS: [HR Chart] [O2 Chart] [Glucose Chart]     │
├─────────────────────────────────────────────────────┤
│  MOLECULAR PATHWAYS: [Nrf2] [mTOR] [AMPK] [NF-κB]  │
├─────────────────────────────────────────────────────┤
│  ACTION BUTTONS: 6 neurohormonal controls           │
├─────────────────────────────────────────────────────┤
│  ACTIVE EVENTS (if any)                             │
└─────────────────────────────────────────────────────┘
```

---

## 🧮 Novas Regras de Simulação

### **Homeostase Automática:**

Todos os novos parâmetros possuem drift automático para baseline:

```typescript
// Exemplo: Osmolaridade tende a 290
osmolarity += (290 - osmolarity) * 0.01;

// pH tende a 7.4
pH += (7.4 - pH) * 0.02;
```

### **Interações Fisiológicas:**

- **Glicose alta → Osmolaridade aumenta**
- **Exercício → VO₂ max aumenta (treinamento)**
- **Lactato alto → pH diminui (acidose)**
- **Respiração alta → pH aumenta (compensação)**
- **Stress → Nrf2 ativado**
- **Glicose + Insulina → mTOR ativado**
- **Baixa energia → AMPK ativado**
- **Stress + Lactato → NF-κB ativado**

---

## 🎯 Como Usar as Novas Features

### **1. Monitorar Vias Moleculares:**

Observe as barras de ativação:
- Verde (< 40%): Níveis normais
- Amarelo (40-70%): Ativação moderada
- Vermelho (> 70%): Ativação alta

**Estratégias:**
- Se AMPK alto → Use "Release Glucose"
- Se NF-κB alto → Use "Reduce Cortisol"
- Se mTOR baixo → Garanta glicose adequada

### **2. Analisar Gráficos:**

Os charts mostram tendências:
- **Picos repentinos** → Evento ativo
- **Oscilações** → Sistema compensando
- **Platô** → Estabilidade alcançada

### **3. Explorar Órgãos:**

**Clique** em qualquer visualização de tecido para:
- Ver detalhes ampliados
- Entender funções específicas
- Monitorar métricas exclusivas

### **4. Balancear Eletrólitos:**

Mantenha os eletrólitos em range:
- **Na+ crítico:** < 130 ou > 150
- **K+ crítico:** < 3.5 ou > 5.5
- **pH crítico:** < 7.35 ou > 7.45

---

## 🔬 Detalhes Técnicos

### **Novos Componentes React:**

```typescript
<LiverTissue />      // Fígado com hepatócitos
<KidneyNephrons />   // Rins com néfrons
<MuscleFibers />     // Fibras musculares
<NeuronNetwork />    // Rede neural
<MolecularPathways /> // Vias de sinalização
<RealTimeChart />    // Gráfico temporal
<DetailModal />      // Modal de detalhes
```

### **Estado Estendido (Zustand):**

```typescript
interface Physiology {
  // ... parâmetros existentes
  osmolarity: number;
  vo2Max: number;
  pH: number;
  sodium: number;
  potassium: number;
  calcium: number;
  nrf2: number;
  mtor: number;
  ampk: number;
  nfkb: number;
}
```

### **Loop de Simulação Atualizado:**

Cada tick (200ms) agora também atualiza:
- Osmolaridade baseada em glicose
- VO₂ max com efeito de treinamento
- pH com compensação respiratória
- Eletrólitos com homeostase
- 4 vias moleculares baseadas em condições

---

## 🎨 Estética Sci-Fi Medical HUD

### **Paleta de Cores:**

- **Cyan (#06B6D4):** Dados normais, bordas
- **Purple (#7C3AED):** Ações, pathways
- **Red (#EF4444):** Coração, alertas
- **Yellow (#FBBF24):** Glicose, warnings
- **Green (#10B981):** OK, antioxidantes
- **Orange (#F97316):** Temperatura, moderado

### **Animações:**

- Pulsação de órgãos sincronizada
- Fluxo de partículas em tempo real
- Gráficos com path animation
- Modais com spring physics
- Indicadores piscando em ativação alta

---

## 📚 Conceitos Educacionais

### **O que o jogador aprende:**

1. **Fisiologia Celular:**
   - Como células diferentes funcionam
   - Estruturas subcelulares (mitocôndrias, núcleo)
   - Comunicação celular (sinapses)

2. **Bioquímica:**
   - Vias de sinalização
   - Metabolismo energético
   - Equilíbrio ácido-base

3. **Homeostase:**
   - Feedback negativo
   - Compensação fisiológica
   - Limites críticos

4. **Medicina:**
   - Valores de referência
   - Interpretação de exames
   - Relações causa-efeito

---

## 🚀 Performance

### **Otimizações:**

- Gráficos limitados a 50 pontos
- Animações com `will-change` CSS
- Componentes React.memo onde aplicável
- SVG otimizado sem excesso de elementos
- Modais com lazy rendering

### **Recomendações:**

- Chrome/Edge para melhor performance
- Hardware decente para animações fluidas
- Monitor 1920x1080 ou superior para HUD completo

---

## 🎮 Gameplay Avançado

### **Novos Desafios:**

Com as vias moleculares, o jogador deve:

1. **Balancear crescimento vs energia:**
   - mTOR (crescimento) vs AMPK (economia)
   
2. **Gerenciar inflamação:**
   - NF-κB alto = problema
   - Reduzir stress e lactato

3. **Proteger contra oxidação:**
   - Nrf2 deve ativar em stress
   - Mas não ficar alto demais por muito tempo

4. **Manter pH:**
   - Evitar acidose (lactato)
   - Usar ventilação para compensar

---

## 📖 Referências Científicas

As vias moleculares implementadas são baseadas em:

- **Nrf2:** Zhang DD, et al. (2004) "Keap1 is a redox-regulated substrate adaptor protein..."
- **mTOR:** Saxton RA, Sabatini DM (2017) "mTOR Signaling in Growth, Metabolism, and Disease"
- **AMPK:** Hardie DG (2014) "AMPK—sensing energy while talking to other signaling pathways"
- **NF-κB:** Liu T, et al. (2017) "NF-κB signaling in inflammation"

---

## 🎯 Próximas Expansões Sugeridas

### **Features Futuras:**

- [ ] Sistema imunológico (leucócitos, anticorpos)
- [ ] Sistema endócrino expandido (tireoide, suprarrenais)
- [ ] Microbioma intestinal
- [ ] Ciclo circadiano
- [ ] Dano e regeneração tecidual
- [ ] Envelhecimento celular
- [ ] Expressão gênica
- [ ] Mitocôndrias detalhadas
- [ ] Sistema linfático
- [ ] Barreira hematoencefálica

---

**🎉 Agora você tem um HUD médico completo de nível sci-fi! Explore, aprenda e divirta-se controlando seu corpo em nível celular! 🧬**
