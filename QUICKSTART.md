# 🚀 Body Ops - Quick Start Guide

## Instalação e Execução

### 1. Instalar dependências (primeira vez apenas)
```bash
npm install
```

### 2. Iniciar servidor de desenvolvimento
```bash
npm run dev
```

O jogo estará disponível em: **http://localhost:5173**

### 3. Build para produção
```bash
npm run build
npm run preview
```

## 🎮 Como Jogar

1. **Observe os parâmetros vitais** nos painéis laterais
2. **Veja as animações** do coração, pulmões e circulação no centro
3. **Aguarde eventos** aleatórios que afetarão a fisiologia
4. **Use as ações** no painel inferior para controlar o corpo
5. **Mantenha a homeostase** e evite valores críticos (⚠️)

## 📊 Parâmetros Importantes

- **Heart Rate (FC):** 60-100 BPM normal
- **Blood Oxygen (SpO₂):** >95% ideal
- **Blood Pressure:** 120/80 mmHg normal
- **Glucose:** 70-100 mg/dL ideal
- **Energy:** Acima de 30%
- **Stress:** Abaixo de 70%

## 🎯 Dicas

- **Adrenalina** aumenta FC e energia mas gasta recursos
- **Cortisol** aumenta com stress, use ações calmantes
- **Eventos** são aleatórios, adapte sua estratégia
- **Cooldowns** impedem uso excessivo de ações
- **Perfusão** dos órgãos mostra saúde geral

## 🐛 Troubleshooting

**Erro ao executar npm:**
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Porta 5173 já em uso:**
```bash
# O Vite automaticamente tentará a próxima porta disponível
```

**Animações lentas:**
- Verifique se o navegador suporta Framer Motion
- Use Chrome/Edge para melhor performance

## 🛠️ Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run preview` - Preview do build
- `npm run lint` - Verificar código

## 📝 Notas

- Este é um **simulador educacional** simplificado
- Não substitui conhecimento médico real
- Divirta-se aprendendo fisiologia! 🧠
