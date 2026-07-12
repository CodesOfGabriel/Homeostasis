import { useEffect, useRef, type ReactNode } from 'react';
import { Activity, BatteryCharging, Droplets, Gauge, Wind, Zap } from 'lucide-react';
import type { MitochondrialProcessing } from '../../game/cellularTypes';
import { advanceFlowProgress, calculateEtcParticleCount, MAX_ETC_PARTICLES } from './flowAnimation';
import { GlassPanel, PanelLabel, ProgressBar } from './ui';

interface ElectronTransportChainProps {
  fluxPercent: number;
  membranePotentialMv: number;
  atpSynthaseFlux: number;
  oxygenMmHg: number;
  nadhPercent: number;
  healthPercent: number;
  oxidativeStress: number;
  processing: MitochondrialProcessing;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const complexes = [
  { x: 142, width: 72, number: 'I', name: 'NADH desidrogenase', detail: 'NADH → NAD⁺', pumps: true },
  { x: 258, width: 64, number: 'II', name: 'Succinato desidrogenase', detail: 'FADH₂ → FAD', pumps: false },
  { x: 414, width: 72, number: 'III', name: 'Citocromo bc₁', detail: 'Q → cyt c', pumps: true },
  { x: 566, width: 72, number: 'IV', name: 'Citocromo c oxidase', detail: 'O₂ → H₂O', pumps: true },
] as const;

const protonParticles = Array.from({ length: 16 }, (_, index) => ({
  x: 88 + index * 44 + (index % 3) * 7,
  y: 72 + (index % 4) * 11,
}));

const rosParticles = Array.from({ length: 8 }, (_, index) => ({
  x: 190 + index * 42,
  y: 286 + (index % 3) * 8,
}));

export function ElectronTransportChain({
  fluxPercent,
  membranePotentialMv,
  atpSynthaseFlux,
  oxygenMmHg,
  nadhPercent,
  healthPercent,
  oxidativeStress,
  processing,
}: ElectronTransportChainProps) {
  const activity = clamp(fluxPercent, 6, 100);
  const oxygenAdequacy = clamp(oxygenMmHg / 40 * 100, 0, 100);
  const coupling = clamp((Math.abs(membranePotentialMv) - 90) / 70 * 100, 0, 100);
  const synthaseSpin = clamp(5.5 - atpSynthaseFlux * 0.055, 1.2, 5.5);
  const protonCount = Math.round(clamp(3 + coupling * .13, 3, protonParticles.length));
  const rosCount = Math.round(clamp(oxidativeStress * .08, 0, rosParticles.length));
  const molecules = [
    { name: 'Piruvato', formula: 'C₃H₃O₃⁻', value: processing.pyruvatePerMin, color: '#55be83' },
    { name: 'Ácido graxo', formula: 'AG-CoA', value: processing.fattyAcidPerMin, color: '#e2a54f' },
    { name: 'NADH', formula: 'NADH', value: processing.nadhPerMin, color: '#58bdd0' },
    { name: 'FADH₂', formula: 'FADH₂', value: processing.fadh2PerMin, color: '#d9b45f' },
    { name: 'Oxigênio', formula: 'O₂', value: processing.oxygenPerMin, color: '#72d8e8' },
    { name: 'Prótons', formula: 'H⁺', value: processing.protonsPerMin, color: '#8ee8f0' },
    { name: 'ADP + fosfato', formula: 'ADP + Pi', value: processing.adpPerMin, color: '#b3a6dc' },
    { name: 'ATP', formula: 'ATP', value: processing.atpPerMin, color: '#d9b45f' },
    { name: 'Água', formula: 'H₂O', value: processing.waterPerMin, color: '#55b7bd' },
  ];

  return (
    <GlassPanel soft className="mt-4 overflow-hidden border-cyan/15">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div>
          <PanelLabel icon={<Zap className="size-4 text-cyan"/>}>Cadeia de transporte de elétrons</PanelLabel>
          <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
            Elétrons de NADH e FADH₂ percorrem os complexos I–IV. O bombeamento de H⁺ cria o gradiente usado pela ATP sintase.
          </p>
        </div>
        <div className="rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1.5 font-mono text-[10px] text-cyan">
          FLUXO {fluxPercent.toFixed(0)}%
        </div>
      </div>

      <div className="scrollbar-thin mt-3 overflow-x-auto px-3 pb-1">
        <svg
          className="min-w-[820px]"
          viewBox="0 0 860 360"
          role="img"
          aria-label="Diagrama da cadeia respiratória mitocondrial com complexos um a quatro, coenzima Q, citocromo c, gradiente de prótons e ATP sintase"
        >
          <defs>
            <linearGradient id="etc-membrane" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#14323b" stopOpacity=".72"/>
              <stop offset=".5" stopColor="#1b4450" stopOpacity=".95"/>
              <stop offset="1" stopColor="#14323b" stopOpacity=".72"/>
            </linearGradient>
            <linearGradient id="etc-complex" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#58bdd0" stopOpacity=".34"/>
              <stop offset="1" stopColor="#162c35" stopOpacity=".96"/>
            </linearGradient>
            <linearGradient id="etc-atp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9b45f" stopOpacity=".45"/>
              <stop offset="1" stopColor="#352f20" stopOpacity=".94"/>
            </linearGradient>
            <filter id="etc-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <marker id="etc-arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#58bdd0"/>
            </marker>
            <marker id="etc-arrow-gold" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#d9b45f"/>
            </marker>
            <path id="electron-route" d="M92 222 C130 222 145 221 178 221 S230 251 289 251 S338 221 450 221 S514 181 602 181"/>
          </defs>

          <rect x="20" y="20" width="820" height="320" rx="18" fill="#071016" fillOpacity=".42" stroke="#58bdd0" strokeOpacity=".12"/>
          <text x="44" y="49" fill="#929ba9" fontSize="10" letterSpacing="2">ESPAÇO INTERMEMBRANA · RESERVATÓRIO DE H⁺</text>
          <text x="44" y="326" fill="#929ba9" fontSize="10" letterSpacing="2">MATRIZ MITOCONDRIAL</text>

          {protonParticles.map((particle, index) => <g key={`gradient-${index}`} opacity={index < protonCount ? .32 + coupling * .006 : .04}>
            <circle cx={particle.x} cy={particle.y} r="8" fill="#102c34" stroke="#58bdd0" strokeOpacity=".75"/>
            <text x={particle.x} y={particle.y + 3.5} textAnchor="middle" fill="#8ee8f0" fontSize="8">H⁺</text>
          </g>)}

          <rect x="38" y="128" width="784" height="96" rx="44" fill="url(#etc-membrane)" stroke="#58bdd0" strokeOpacity=".25"/>
          <path d="M54 150 H806 M54 202 H806" stroke="#76d5df" strokeOpacity=".24" strokeWidth="3" strokeDasharray="2 8"/>
          <text x="48" y="120" fill="#58bdd0" fillOpacity=".65" fontSize="9" letterSpacing="1.7">MEMBRANA INTERNA</text>

          {complexes.map(complex => (
            <g key={complex.number}>
              <title>{complex.name}: {complex.detail}{complex.pumps ? '; bombeia prótons' : '; não bombeia prótons'}</title>
              <rect x={complex.x} y={complex.number === 'IV' ? 143 : 159} width={complex.width} height={complex.number === 'IV' ? 78 : 102} rx="15" fill="url(#etc-complex)" stroke="#58bdd0" strokeOpacity=".7"/>
              <circle cx={complex.x + complex.width / 2} cy={complex.number === 'IV' ? 180 : 197} r="18" fill="#071016" stroke="#58bdd0" strokeOpacity=".62"/>
              <text x={complex.x + complex.width / 2} y={complex.number === 'IV' ? 185 : 202} textAnchor="middle" fill="#e6e8ec" fontFamily="Cinzel, serif" fontSize="17">{complex.number}</text>
              <text x={complex.x + complex.width / 2} y={complex.number === 'IV' ? 238 : 280} textAnchor="middle" fill="#929ba9" fontSize="9">{complex.detail}</text>
            </g>
          ))}

          <g>
            <title>Coenzima Q transporta elétrons dos complexos I e II ao complexo III</title>
            <circle cx="358" cy="222" r="25" fill="#102c32" stroke="#d9b45f" strokeOpacity=".75"/>
            <text x="358" y="218" textAnchor="middle" fill="#d9b45f" fontSize="11" fontWeight="600">CoQ</text>
            <text x="358" y="231" textAnchor="middle" fill="#929ba9" fontSize="8">Q/QH₂</text>
          </g>
          <g>
            <title>Citocromo c transporta elétrons do complexo III ao complexo IV</title>
            <rect x="504" y="92" width="58" height="31" rx="15" fill="#2f2520" stroke="#d9b45f" strokeOpacity=".8"/>
            <text x="533" y="112" textAnchor="middle" fill="#d9b45f" fontSize="10" fontWeight="600">cyt c</text>
            <path d="M470 158 C486 125 502 111 516 108 M551 109 C574 114 586 130 598 146" fill="none" stroke="#d9b45f" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#etc-arrow-gold)"/>
          </g>

          <path d="M92 222 C130 222 145 221 178 221 S230 251 289 251 S338 221 450 221 S514 181 602 181" fill="none" stroke="#58bdd0" strokeOpacity=".28" strokeWidth="7"/>
          <path d="M92 222 C130 222 145 221 178 221 S230 251 289 251 S338 221 450 221 S514 181 602 181" fill="none" stroke="#58bdd0" strokeWidth="2" strokeDasharray="7 10" markerEnd="url(#etc-arrow-cyan)" className="animate-flow"/>
          <ElectronParticles activity={activity}/>

          <g fill="#58bdd0" fontSize="11" fontWeight="600">
            {complexes.filter(complex => complex.pumps).map((complex, index) => {
              const x = complex.x + complex.width / 2;
              return <g key={`pump-${complex.number}`}>
                <path d={`M${x} 154 V76`} stroke="#58bdd0" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#etc-arrow-cyan)"/>
                <circle cx={x - 13} cy={66 - index * 4} r="10" fill="#112d34" stroke="#58bdd0" strokeOpacity=".55"/>
                <text x={x - 13} y={70 - index * 4} textAnchor="middle">H⁺</text>
              </g>;
            })}
          </g>

          <g>
            <text x="58" y="199" fill="#e6e8ec" fontSize="12" fontWeight="600">NADH</text>
            <text x="58" y="238" fill="#929ba9" fontSize="9">2 e⁻</text>
            <text x="237" y="292" fill="#e6e8ec" fontSize="11" fontWeight="600">FADH₂</text>
            <path d="M278 277 V260" stroke="#d9b45f" strokeWidth="1.5" markerEnd="url(#etc-arrow-gold)"/>
            <text x="648" y="173" fill="#e6e8ec" fontSize="11" fontWeight="600">½ O₂ + 2H⁺</text>
            <path d="M650 180 H632" stroke="#58bdd0" strokeWidth="1.5" markerEnd="url(#etc-arrow-cyan)"/>
            <text x="649" y="202" fill="#58bdd0" fontSize="10">H₂O</text>
          </g>

          <g aria-label="Vazamento de espécies reativas de oxigênio">
            <title>ROS aumenta conforme o estresse oxidativo celular</title>
            {rosParticles.map((particle, index) => <circle key={`ros-${index}`} cx={particle.x} cy={particle.y} r="4" fill="#dc6658" filter="url(#etc-glow)" opacity={index < rosCount ? .85 : .035}/>) }
          </g>

          <g transform="translate(715 88)">
            <title>ATP sintase: o retorno de prótons converte ADP e fosfato em ATP</title>
            <path d="M45 -15 V34" stroke="#d9b45f" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#etc-arrow-gold)"/>
            <text x="58" y="4" fill="#d9b45f" fontSize="11">H⁺</text>
            <rect x="19" y="34" width="53" height="79" rx="20" fill="url(#etc-atp)" stroke="#d9b45f" strokeOpacity=".78"/>
            <g className="origin-[45px_72px] animate-spin" style={{ animationDuration: `${synthaseSpin}s` }}>
              <circle cx="45" cy="72" r="22" fill="#191a17" stroke="#d9b45f" strokeOpacity=".75"/>
              <path d="M45 50 V94 M23 72 H67 M30 57 L60 87 M60 57 L30 87" stroke="#d9b45f" strokeOpacity=".55"/>
            </g>
            <path d="M45 113 V139" stroke="#d9b45f" strokeWidth="3"/>
            <ellipse cx="45" cy="149" rx="33" ry="18" fill="#302a1c" stroke="#d9b45f"/>
            <text x="45" y="153" textAnchor="middle" fill="#e6e8ec" fontSize="10" fontWeight="700">ATPase</text>
            <text x="45" y="184" textAnchor="middle" fill="#929ba9" fontSize="9">ADP + Pi</text>
            <path d="M45 190 V211" stroke="#d9b45f" strokeWidth="1.5" markerEnd="url(#etc-arrow-gold)"/>
            <text x="45" y="231" textAnchor="middle" fill="#d9b45f" fontFamily="Cinzel, serif" fontSize="18">ATP</text>
          </g>
        </svg>
      </div>

      <div className="border-t border-white/5 bg-black/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><PanelLabel>Moléculas sendo processadas</PanelLabel><span className="text-[8px] text-muted-foreground">fluxos normalizados em equivalentes/min</span></div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 lg:grid-cols-5">
          {molecules.map(molecule => <MoleculeCounter key={molecule.name} {...molecule}/>) }
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-white/5 bg-white/5 sm:grid-cols-4">
        <ChainMetric icon={<Activity className="size-3.5"/>} label="NADH disponível" value={`${nadhPercent.toFixed(0)}%`} progress={nadhPercent}/>
        <ChainMetric icon={<Wind className="size-3.5"/>} label="Aceitador O₂" value={`${oxygenMmHg.toFixed(0)} mmHg`} progress={oxygenAdequacy}/>
        <ChainMetric icon={<Gauge className="size-3.5"/>} label="Força próton-motriz" value={`${membranePotentialMv.toFixed(0)} mV`} progress={coupling}/>
        <ChainMetric icon={<BatteryCharging className="size-3.5"/>} label="Acoplamento" value={`${healthPercent.toFixed(0)}%`} progress={healthPercent}/>
      </div>
    </GlassPanel>
  );
}

const electronRoute = 'M92 222 C130 222 145 221 178 221 S230 251 289 251 S338 221 450 221 S514 181 602 181';

function ElectronParticles({ activity }: { activity: number }) {
  const path = useRef<SVGPathElement>(null);
  const particles = useRef<Array<SVGCircleElement | null>>([]);
  const activityRef = useRef(activity);
  const targetCount = useRef(calculateEtcParticleCount(activity));
  const activeCount = useRef(targetCount.current);
  const progress = useRef(Array.from({ length: MAX_ETC_PARTICLES }, (_, index) => index / Math.max(1, targetCount.current)));
  activityRef.current = activity;
  targetCount.current = calculateEtcParticleCount(activity);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let spawnAccumulator = 0;
    const animate = (now: number) => {
      const route = path.current;
      const delta = Math.min(.08, Math.max(0, (now - last) / 1000));
      last = now;
      if (targetCount.current < activeCount.current) activeCount.current = targetCount.current;
      if (targetCount.current > activeCount.current) {
        spawnAccumulator += delta;
        while (spawnAccumulator >= .12 && activeCount.current < targetCount.current) {
          progress.current[activeCount.current] = 0;
          activeCount.current += 1;
          spawnAccumulator -= .12;
        }
      }
      if (route) {
        const length = route.getTotalLength();
        const speed = .075 + activityRef.current * .00125;
        particles.current.forEach((particle, index) => {
          if (!particle) return;
          const visible = index < activeCount.current;
          particle.style.opacity = visible ? '1' : '0';
          if (!visible) return;
          progress.current[index] = advanceFlowProgress(progress.current[index], speed, delta);
          const point = route.getPointAtLength(progress.current[index] * length);
          particle.setAttribute('cx', point.x.toFixed(2));
          particle.setAttribute('cy', point.y.toFixed(2));
        });
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <g aria-label={`${targetCount.current} transportadores de elétrons animados`}>
    <path ref={path} d={electronRoute} fill="none" stroke="none"/>
    {Array.from({ length: MAX_ETC_PARTICLES }, (_, index) => <circle
      key={index}
      ref={element => { particles.current[index] = element; }}
      r="4.5"
      fill="#d9b45f"
      filter="url(#etc-glow)"
      opacity="0"
    />)}
  </g>;
}

function formatMolecularRate(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function MoleculeCounter({ name, formula, value, color }: { name: string; formula: string; value: number; color: string }) {
  return <div className="rounded-lg border border-white/8 bg-black/20 px-2 py-2">
    <div className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 7px ${color}` }}/><span className="truncate text-[8px] uppercase tracking-wider text-muted-foreground">{name}</span></div>
    <div className="mt-1 flex items-baseline justify-between gap-1"><strong className="font-mono text-[11px] text-foreground">{formatMolecularRate(value)}</strong><span className="text-[8px]" style={{ color }}>{formula}</span></div>
  </div>;
}

function ChainMetric({ icon, label, value, progress }: { icon: ReactNode; label: string; value: string; progress: number }) {
  return (
    <div className="bg-black/15 p-3">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <strong className="font-mono text-xs font-medium text-foreground">{value}</strong>
        <Droplets className="size-3 text-cyan/50"/>
      </div>
      <div className="mt-2"><ProgressBar value={progress} color="var(--cyan)"/></div>
    </div>
  );
}
