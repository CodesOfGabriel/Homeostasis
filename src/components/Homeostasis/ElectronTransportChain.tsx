import { useEffect, useRef, type ReactNode } from 'react';
import { Activity, BatteryCharging, Droplets, Gauge, Wind, Zap } from 'lucide-react';
import type { MitochondrialProcessing } from '../../game/cellularTypes';
import { advanceFlowProgress, calculateEtcParticleCount, MAX_ETC_PARTICLES } from './flowAnimation';
import { GlassPanel, PanelLabel, ProgressBar, cn } from './ui';

interface ElectronTransportChainProps {
  fluxPercent: number;
  membranePotentialMv: number;
  atpSynthaseFlux: number;
  oxygenMmHg: number;
  nadhPercent: number;
  healthPercent: number;
  oxidativeStress: number;
  processing: MitochondrialProcessing;
  className?: string;
}

export function ElectronTransportChainBackdrop(props: ElectronTransportChainProps) {
  return (
    <div className="mitochondrial-chain-backdrop" aria-hidden="true">
      <ElectronTransportChain {...props}/>
    </div>
  );
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

interface MolecularTrack {
  id: string;
  path: string;
  formula: string;
  color: string;
  count: number;
  baseSpeed: number;
  radius: number;
  driver: 'flux' | 'coupling' | 'atp';
  label: string;
}

const MOLECULAR_TRACKS: MolecularTrack[] = [
  { id: 'proton-pump-i', path: 'M178 260 C174 214 181 146 178 72', formula: 'H⁺', color: '#8ee8f0', count: 4, baseSpeed: .24, radius: 6.5, driver: 'flux', label: 'Prótons bombeados pelo complexo I' },
  { id: 'proton-pump-iii', path: 'M450 260 C445 210 454 142 450 72', formula: 'H⁺', color: '#8ee8f0', count: 4, baseSpeed: .25, radius: 6.5, driver: 'flux', label: 'Prótons bombeados pelo complexo III' },
  { id: 'proton-pump-iv', path: 'M602 235 C598 190 606 132 602 72', formula: 'H⁺', color: '#8ee8f0', count: 4, baseSpeed: .27, radius: 6.5, driver: 'flux', label: 'Prótons bombeados pelo complexo IV' },
  { id: 'proton-return-atpase', path: 'M760 68 C766 91 752 112 760 139 C768 160 752 181 760 204', formula: 'H⁺', color: '#d9b45f', count: 5, baseSpeed: .3, radius: 6.5, driver: 'coupling', label: 'Prótons retornando pela ATP sintase' },
  { id: 'coq-from-i', path: 'M212 224 C258 220 306 224 337 222 C374 219 393 220 414 221', formula: 'Q', color: '#d9b45f', count: 2, baseSpeed: .2, radius: 6, driver: 'flux', label: 'Coenzima Q transportando elétrons do complexo I ao III' },
  { id: 'coq-from-ii', path: 'M322 248 C348 246 373 230 414 222', formula: 'Q', color: '#d9b45f', count: 2, baseSpeed: .22, radius: 6, driver: 'flux', label: 'Coenzima Q transportando elétrons do complexo II ao III' },
  { id: 'cytochrome-c', path: 'M470 158 C488 126 505 108 532 108 C559 108 580 128 598 146', formula: 'c', color: '#e4c978', count: 3, baseSpeed: .23, radius: 5.5, driver: 'flux', label: 'Citocromo c transportando elétrons do complexo III ao IV' },
  { id: 'oxygen-entry', path: 'M704 162 C681 163 659 169 632 181', formula: 'O₂', color: '#72d8e8', count: 2, baseSpeed: .18, radius: 6.5, driver: 'flux', label: 'Oxigênio entrando no complexo IV' },
  { id: 'water-output', path: 'M632 199 C653 208 672 222 699 242', formula: 'H₂O', color: '#55b7bd', count: 2, baseSpeed: .16, radius: 7, driver: 'flux', label: 'Água produzida pelo complexo IV' },
  { id: 'atp-output', path: 'M760 286 C760 307 779 322 809 334', formula: 'ATP', color: '#d9b45f', count: 3, baseSpeed: .18, radius: 8, driver: 'atp', label: 'ATP liberado pela ATP sintase' },
];

export function ElectronTransportChain({
  fluxPercent,
  membranePotentialMv,
  atpSynthaseFlux,
  oxygenMmHg,
  nadhPercent,
  healthPercent,
  oxidativeStress,
  processing,
  className,
}: ElectronTransportChainProps) {
  const activity = clamp(fluxPercent, 6, 100);
  const oxygenAdequacy = clamp(oxygenMmHg / 40 * 100, 0, 100);
  const coupling = clamp((Math.abs(membranePotentialMv) - 90) / 70 * 100, 0, 100);
  const synthaseSpin = clamp(5.5 - atpSynthaseFlux * 0.055, 1.2, 5.5);
  const protonCount = Math.round(clamp(3 + coupling * .13, 3, protonParticles.length));
  const rosCount = Math.round(clamp(oxidativeStress * .08, 0, rosParticles.length));
  const electronRate = (processing.nadhPerMin + processing.fadh2PerMin) * 2;
  const processNodes: ProcessCardProps[] = [
    { color: '#58bdd0', title: 'Complexo I', reaction: 'NADH → NAD⁺ + 2e⁻', rateValue: formatMolecularRate(processing.nadhPerMin), rateUnit: '/min', sourceLabel: 'Piruvato', sourceValue: `${formatMolecularRate(processing.pyruvatePerMin)}/min` },
    { color: '#d9b45f', title: 'Complexo II', reaction: 'FADH₂ → FAD + 2e⁻', rateValue: formatMolecularRate(processing.fadh2PerMin), rateUnit: '/min', sourceLabel: 'Ácido graxo', sourceValue: `${formatMolecularRate(processing.fattyAcidPerMin)}/min` },
    { color: '#d9b45f', title: 'Complexo III', reaction: 'CoQH₂ → citocromo c', rateValue: formatMolecularRate(electronRate), rateUnit: 'e⁻/min', sourceLabel: 'H⁺ total', sourceValue: `${formatMolecularRate(processing.protonsPerMin)}/min` },
    { color: '#72d8e8', title: 'Complexo IV', reaction: 'O₂ + e⁻ + H⁺ → H₂O', rateValue: formatMolecularRate(processing.oxygenPerMin), rateUnit: 'O₂/min', sourceLabel: 'H₂O produzida', sourceValue: `${formatMolecularRate(processing.waterPerMin)}/min` },
    { color: '#d9b45f', title: 'ATP sintase', reaction: 'ADP + Pi + H⁺ → ATP', rateValue: formatMolecularRate(processing.adpPerMin), rateUnit: 'ADP/min', sourceLabel: 'ATP produzido', sourceValue: `${formatMolecularRate(processing.atpPerMin)}/min` },
  ];

  return (
    <GlassPanel soft className={cn('mt-4 overflow-hidden border-cyan/15', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div>
          <PanelLabel icon={<Zap className="size-4 text-cyan"/>}>Cadeia de transporte de elétrons</PanelLabel>
          <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
            Elétrons de NADH e FADH₂ percorrem os complexos I–IV. O bombeamento de H⁺ cria o gradiente usado pela ATP sintase.
          </p>
        </div>
        <div className="rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1.5 font-mono text-[11px] text-cyan">
          FLUXO {fluxPercent.toFixed(0)}%
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 px-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {processNodes.map(node => <ProcessCard key={node.title} {...node}/>) }
      </div>

      <div className="scrollbar-thin mt-3 overflow-x-auto px-3 pb-1">
        <svg
          className="h-auto w-full min-w-[760px] xl:min-w-0"
          viewBox="0 0 860 360"
          role="img"
          aria-label="Diagrama da cadeia respiratória mitocondrial com moléculas e taxas ancoradas aos complexos um a quatro e à ATP sintase"
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

          <g>
          <rect x="20" y="20" width="820" height="320" rx="18" fill="#071016" fillOpacity=".42" stroke="#58bdd0" strokeOpacity=".12"/>
          <text x="44" y="49" fill="#929ba9" fontSize="10" letterSpacing="2">ESPAÇO INTERMEMBRANA · RESERVATÓRIO DE H⁺</text>
          <text x="44" y="326" fill="#929ba9" fontSize="10" letterSpacing="2">MATRIZ MITOCONDRIAL</text>

          {protonParticles.map((particle, index) => <g key={`gradient-${index}`} className="etc-proton-reservoir" opacity={index < protonCount ? .32 + coupling * .006 : .04} style={{ animationDelay: `${-index * .17}s`, animationDuration: `${2.8 - coupling * .012 + index % 3 * .18}s` }}>
            <circle cx={particle.x} cy={particle.y} r="8" fill="#102c34" stroke="#58bdd0" strokeOpacity=".75" filter={index < protonCount ? 'url(#etc-glow)' : undefined}/>
            <text x={particle.x} y={particle.y + 3.5} textAnchor="middle" fill="#8ee8f0" fontSize="8">H⁺</text>
          </g>)}

          <rect x="38" y="128" width="784" height="96" rx="44" fill="url(#etc-membrane)" stroke="#58bdd0" strokeOpacity=".25"/>
          <path d="M54 150 H806 M54 202 H806" className="etc-membrane-energy" stroke="#76d5df" strokeOpacity=".24" strokeWidth="3" strokeDasharray="2 8"/>
          <text x="48" y="120" fill="#58bdd0" fillOpacity=".65" fontSize="9" letterSpacing="1.7">MEMBRANA INTERNA</text>

          {complexes.map((complex, index) => {
            const cycle = Math.max(1.05, 2.5 - activity * .012 + index * .08);
            return <g key={complex.number} className="etc-complex-node" style={{ animationDuration: `${cycle}s`, animationDelay: `${-index * .34}s` }}>
              <title>{complex.name}: {complex.detail}{complex.pumps ? '; bombeia prótons' : '; não bombeia prótons'}</title>
              <rect className="etc-complex-body" style={{ animationDuration: `${cycle}s`, animationDelay: `${-index * .34}s` }} x={complex.x} y={complex.number === 'IV' ? 143 : 159} width={complex.width} height={complex.number === 'IV' ? 78 : 102} rx="15" fill="url(#etc-complex)" stroke="#58bdd0" strokeOpacity=".7"/>
              <circle className="etc-complex-core" style={{ animationDuration: `${Math.max(.8, cycle * .72)}s`, animationDelay: `${-index * .21}s` }} cx={complex.x + complex.width / 2} cy={complex.number === 'IV' ? 180 : 197} r="18" fill="#071016" stroke="#58bdd0" strokeOpacity=".62"/>
              <text x={complex.x + complex.width / 2} y={complex.number === 'IV' ? 185 : 202} textAnchor="middle" fill="#e6e8ec" fontFamily="Cinzel, serif" fontSize="17">{complex.number}</text>
              <text x={complex.x + complex.width / 2} y={complex.number === 'IV' ? 238 : 280} textAnchor="middle" fill="#929ba9" fontSize="9">{complex.detail}</text>
            </g>;
          })}

          <g>
            <title>Coenzima Q transporta elétrons dos complexos I e II ao complexo III</title>
            <circle className="etc-coq-core" cx="358" cy="222" r="25" fill="#102c32" stroke="#d9b45f" strokeOpacity=".75"/>
            <text x="358" y="218" textAnchor="middle" fill="#d9b45f" fontSize="11" fontWeight="600">CoQ</text>
            <text x="358" y="231" textAnchor="middle" fill="#929ba9" fontSize="8">Q/QH₂</text>
          </g>
          <g>
            <title>Citocromo c transporta elétrons do complexo III ao complexo IV</title>
            <rect className="etc-cytochrome-core" x="504" y="92" width="58" height="31" rx="15" fill="#2f2520" stroke="#d9b45f" strokeOpacity=".8"/>
            <text x="533" y="112" textAnchor="middle" fill="#d9b45f" fontSize="10" fontWeight="600">cyt c</text>
            <path d="M470 158 C486 125 502 111 516 108 M551 109 C574 114 586 130 598 146" fill="none" stroke="#d9b45f" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#etc-arrow-gold)"/>
          </g>

          <path d="M92 222 C130 222 145 221 178 221 S230 251 289 251 S338 221 450 221 S514 181 602 181" fill="none" stroke="#58bdd0" strokeOpacity=".28" strokeWidth="7"/>
          <path d="M92 222 C130 222 145 221 178 221 S230 251 289 251 S338 221 450 221 S514 181 602 181" fill="none" stroke="#58bdd0" strokeWidth="2" strokeDasharray="7 10" markerEnd="url(#etc-arrow-cyan)" className="animate-flow" style={{ animationDuration: `${Math.max(.55, 1.8 - activity * .012)}s` }}/>
          <ElectronParticles activity={activity}/>

          <g fill="#58bdd0" fontSize="11" fontWeight="600">
            {complexes.filter(complex => complex.pumps).map((complex, index) => {
              const x = complex.x + complex.width / 2;
              return <g key={`pump-${complex.number}`}>
                <path d={`M${x} 154 V76`} stroke="#58bdd0" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#etc-arrow-cyan)"/>
                <circle className="etc-pump-gate" cx={x - 13} cy={66 - index * 4} r="10" fill="#112d34" stroke="#58bdd0" strokeOpacity=".55"/>
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
            {rosParticles.map((particle, index) => <circle key={`ros-${index}`} className="etc-ros-particle" style={{ animationDelay: `${-index * .19}s`, animationDuration: `${1.25 + index % 3 * .22}s` }} cx={particle.x} cy={particle.y} r="4" fill="#dc6658" filter="url(#etc-glow)" opacity={index < rosCount ? .85 : .035}/>) }
          </g>

          <MolecularFlowLayer activity={activity} coupling={coupling} atpSynthaseFlux={atpSynthaseFlux}/>

          <g transform="translate(715 88)">
            <title>ATP sintase: o retorno de prótons converte ADP e fosfato em ATP</title>
            <path d="M45 -15 V34" stroke="#d9b45f" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#etc-arrow-gold)"/>
            <text x="58" y="4" fill="#d9b45f" fontSize="11">H⁺</text>
            <rect className="etc-atp-body" x="19" y="34" width="53" height="79" rx="20" fill="url(#etc-atp)" stroke="#d9b45f" strokeOpacity=".78"/>
            <g className="etc-atp-rotor origin-[45px_72px] animate-spin" style={{ animationDuration: `${synthaseSpin}s` }}>
              <circle cx="45" cy="72" r="22" fill="#191a17" stroke="#d9b45f" strokeOpacity=".75"/>
              <path d="M45 50 V94 M23 72 H67 M30 57 L60 87 M60 57 L30 87" stroke="#d9b45f" strokeOpacity=".55"/>
            </g>
            <path d="M45 113 V139" stroke="#d9b45f" strokeWidth="3"/>
            <ellipse className="etc-atp-catalytic" cx="45" cy="149" rx="33" ry="18" fill="#302a1c" stroke="#d9b45f"/>
            <text x="45" y="153" textAnchor="middle" fill="#e6e8ec" fontSize="10" fontWeight="700">ATPase</text>
            <text x="45" y="184" textAnchor="middle" fill="#929ba9" fontSize="9">ADP + Pi</text>
            <path d="M45 190 V211" stroke="#d9b45f" strokeWidth="1.5" markerEnd="url(#etc-arrow-gold)"/>
            <text x="45" y="231" textAnchor="middle" fill="#d9b45f" fontFamily="Cinzel, serif" fontSize="18">ATP</text>
          </g>
          </g>
        </svg>
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
      className="etc-electron-particle"
      style={{ animationDelay: `${-index * .13}s` }}
      opacity="0"
    />)}
  </g>;
}

function MolecularFlowLayer({ activity, coupling, atpSynthaseFlux }: { activity: number; coupling: number; atpSynthaseFlux: number }) {
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const particles = useRef<Record<string, Array<SVGGElement | null>>>({});
  const progress = useRef<Record<string, number[]>>({});
  const activityRef = useRef(activity);
  const couplingRef = useRef(coupling);
  const atpFluxRef = useRef(atpSynthaseFlux);
  activityRef.current = activity;
  couplingRef.current = coupling;
  atpFluxRef.current = atpSynthaseFlux;

  MOLECULAR_TRACKS.forEach(track => {
    progress.current[track.id] ??= Array.from({ length: track.count }, (_, index) => (index / track.count + track.id.length * .037) % 1);
    particles.current[track.id] ??= Array.from({ length: track.count }, () => null);
  });

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const positionParticles = (delta: number) => {
      MOLECULAR_TRACKS.forEach(track => {
        const route = paths.current[track.id];
        if (!route) return;
        const driver = track.driver === 'flux'
          ? activityRef.current / 100
          : track.driver === 'coupling'
            ? couplingRef.current / 100
            : atpFluxRef.current / 100;
        const normalizedDriver = clamp(driver, 0, 1);
        const speed = track.baseSpeed * (.18 + normalizedDriver * 1.35);
        const length = route.getTotalLength();
        particles.current[track.id]?.forEach((particle, index) => {
          if (!particle) return;
          if (!reducedMotion.matches) progress.current[track.id][index] = advanceFlowProgress(progress.current[track.id][index], speed, delta);
          const point = route.getPointAtLength(progress.current[track.id][index] * length);
          particle.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
          particle.style.opacity = String(.32 + normalizedDriver * .68);
        });
      });
    };

    const animate = (now: number) => {
      const delta = Math.min(.08, Math.max(0, (now - last) / 1000));
      last = now;
      positionParticles(delta);
      frame = requestAnimationFrame(animate);
    };

    positionParticles(0);
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <g aria-label="Fluxos moleculares animados da cadeia respiratória">
    {MOLECULAR_TRACKS.map(track => <g key={track.id} aria-label={track.label}>
      <path ref={element => { paths.current[track.id] = element; }} d={track.path} fill="none" stroke={track.color} strokeOpacity=".08" strokeWidth="1" strokeDasharray="2 7"/>
      {Array.from({ length: track.count }, (_, index) => <g
        key={`${track.id}-${index}`}
        ref={element => { particles.current[track.id][index] = element; }}
        className="etc-molecular-particle"
        style={{ animationDelay: `${-index * .16}s` }}
      >
        <circle r={track.radius} fill="#081019" fillOpacity=".94" stroke={track.color} strokeWidth="1.15" filter="url(#etc-glow)"/>
        <text y="2.2" textAnchor="middle" fill={track.color} fontSize={track.formula.length > 2 ? 4.8 : 6.2} fontWeight="700">{track.formula}</text>
      </g>)}
    </g>)}
  </g>;
}

function formatMolecularRate(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

interface ProcessCardProps {
  color: string;
  title: string;
  reaction: string;
  rateValue: string;
  rateUnit: string;
  sourceLabel: string;
  sourceValue: string;
}

function ProcessCard({ color, title, reaction, rateValue, rateUnit, sourceLabel, sourceValue }: ProcessCardProps) {
  return (
    <article
      aria-label={`${title}: ${rateValue} ${rateUnit}; ${reaction}; ${sourceLabel} ${sourceValue}`}
      className="min-w-0 rounded-xl border bg-black/25 p-3 shadow-[inset_0_1px_rgba(255,255,255,.035)]"
      style={{ borderColor: `${color}55`, backgroundImage: `linear-gradient(145deg, ${color}13, rgba(3,8,12,.3) 58%)` }}
    >
      <header className="flex items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full shadow-[0_0_9px_currentColor]" style={{ color, backgroundColor: color }} />
        <span className="text-[11px] font-semibold uppercase tracking-[.16em]" style={{ color }}>{title}</span>
      </header>
      <div className="mt-2 flex items-baseline gap-1.5">
        <strong className="font-mono text-lg font-semibold tabular-nums text-foreground">{rateValue}</strong>
        <span className="font-mono text-[11px] text-muted-foreground">{rateUnit}</span>
      </div>
      <p className="mt-1.5 min-h-8 text-[11px] font-medium leading-relaxed text-foreground/85">{reaction}</p>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/8 pt-2">
        <span className="min-w-0 text-[11px] uppercase tracking-wider text-muted-foreground">{sourceLabel}</span>
        <strong className="shrink-0 font-mono text-[11px] font-medium tabular-nums text-foreground">{sourceValue}</strong>
      </div>
    </article>
  );
}

function ChainMetric({ icon, label, value, progress }: { icon: ReactNode; label: string; value: string; progress: number }) {
  return (
    <div className="bg-black/15 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <strong className="font-mono text-xs font-medium text-foreground">{value}</strong>
        <Droplets className="size-3 text-cyan/50"/>
      </div>
      <div className="mt-2"><ProgressBar value={progress} color="var(--cyan)"/></div>
    </div>
  );
}
