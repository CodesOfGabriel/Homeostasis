import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { CatmullRomCurve3, Vector3 } from 'three';
import type { SubstrateKind, SubstratePool } from '../../game/cellularTypes';
import {
  calculateDeliveryParticleCount,
  calculateUptakeParticleCount,
  MAX_DELIVERY_PARTICLES,
  MAX_UPTAKE_PARTICLES,
  TRANSPORT_MECHANISMS,
  type TransportMechanism,
} from './flowAnimation';
import {
  DetailedMembraneTransporter,
  EndocyticVesicle,
  ExocyticVesicle,
  IonChannelModel,
  MolecularFlow,
} from './MolecularTransportModels';

export type FlowSubstrateStatus = 'available' | 'capturable' | 'cooldown' | 'limited' | 'excess' | 'toxic' | 'blocked' | 'selected';

export interface FlowChipDatum {
  label: string;
  value: string;
  unit: string;
  status: FlowSubstrateStatus;
  statusLabel: string;
  direction: 'in' | 'out';
}

interface CellularFlowSceneProps {
  available: SubstratePool;
  captured: SubstratePool;
  wasteLoad: number;
  oxidativeStress: number;
  membranePotentialMv: number;
  perfusionPercent: number;
  lactateMmolL: number;
  carbonDioxideMmHg: number;
  running: boolean;
  timeSpeed: number;
  lastCaptured: SubstrateKind | null;
  captureChain: number;
  captureScore: number;
  chips: Record<SubstrateKind, FlowChipDatum>;
  selectedKind: SubstrateKind;
  onSelect: (kind: SubstrateKind) => void;
}

const flowMeta: Record<SubstrateKind, { color: string; molecule: string; transporter: string; mechanism: string; detail: string }> = {
  glucose: {
    color: '#55be83',
    molecule: 'Glicose',
    transporter: 'GLUT4',
    mechanism: 'difusão facilitada',
    detail: 'carreador alterna a abertura; não é um poro livre',
  },
  oxygen: {
    color: '#58bdd0',
    molecule: 'O₂',
    transporter: 'Bicamada lipídica',
    mechanism: 'difusão simples',
    detail: 'atravessa entre os fosfolipídios, sem receptor ou canal',
  },
  fattyAcid: {
    color: '#e2a54f',
    molecule: 'Ácido graxo',
    transporter: 'CD36 / FATP',
    mechanism: 'transporte assistido',
    detail: 'ácido graxo livre entra por CD36/FATP; LDL usa outra rota',
  },
  aminoAcid: {
    color: '#d9b45f',
    molecule: 'Aminoácido',
    transporter: 'LAT1–4F2hc',
    mechanism: 'antiporte',
    detail: 'aminoácido entra enquanto outro deixa a célula',
  },
};

const BACKGROUND_WIDTH = 1672;
const BACKGROUND_HEIGHT = 941;
const BACKGROUND_ASPECT = BACKGROUND_WIDTH / BACKGROUND_HEIGHT;

type ImagePoint = [x: number, y: number];

function imagePoint([x, y]: ImagePoint, z = .1) {
  return new Vector3(
    (x / BACKGROUND_WIDTH - .5) * BACKGROUND_ASPECT * 2,
    (.5 - y / BACKGROUND_HEIGHT) * 2,
    z,
  );
}

function curveFrom(points: ImagePoint[], z = .13) {
  return new CatmullRomCurve3(points.map(point => imagePoint(point, z)));
}

// A entrega termina no LEC: as partículas se dispersam e desaparecem ali.
const deliveryPaths: Record<SubstrateKind, ImagePoint[]> = {
  glucose: [[342, 270], [430, 292], [493, 310], [542, 326], [588, 336]],
  oxygen: [[310, 420], [395, 430], [458, 442], [510, 453], [555, 462]],
  fattyAcid: [[270, 565], [370, 553], [450, 557], [520, 566], [575, 578]],
  aminoAcid: [[260, 720], [365, 701], [470, 683], [555, 674], [620, 677]],
};

// Uma nova população nasce no LEC e só então atravessa a membrana.
const uptakePaths: Record<SubstrateKind, ImagePoint[]> = {
  glucose: [[575, 336], [608, 341], [635, 350], [680, 369], [748, 390]],
  oxygen: [[548, 460], [568, 462], [590, 468], [635, 476], [700, 482]],
  fattyAcid: [[570, 577], [594, 579], [620, 586], [668, 600], [726, 615]],
  aminoAcid: [[615, 676], [643, 678], [675, 682], [720, 686], [780, 681]],
};

const deliveryCurves = Object.fromEntries((Object.keys(deliveryPaths) as SubstrateKind[]).map(kind => [kind, curveFrom(deliveryPaths[kind], .12)])) as Record<SubstrateKind, CatmullRomCurve3>;
const uptakeCurves = Object.fromEntries((Object.keys(uptakePaths) as SubstrateKind[]).map(kind => [kind, curveFrom(uptakePaths[kind], .19)])) as Record<SubstrateKind, CatmullRomCurve3>;

const flowChipPixels: Record<SubstrateKind, ImagePoint> = {
  glucose: [535, 300],
  oxygen: [490, 430],
  fattyAcid: [505, 548],
  aminoAcid: [550, 700],
};

const transporterPixels: Record<SubstrateKind, ImagePoint> = {
  glucose: [635, 350],
  oxygen: [590, 468],
  fattyAcid: [620, 586],
  aminoAcid: [675, 682],
};

const transporterRotations: Record<SubstrateKind, number> = {
  glucose: -.1,
  oxygen: -.03,
  fattyAcid: .11,
  aminoAcid: .16,
};

const mechanismLabels: Record<TransportMechanism, string> = {
  'facilitated-diffusion': 'CARREADOR',
  'simple-diffusion': 'SEM CANAL',
  'fatty-acid-transport': 'TRANSPORTADOR',
  antiport: 'ANTIPORTE',
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function CellularFlowScene(props: CellularFlowSceneProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div
      className="cellular-flow-layer pointer-events-none fixed left-1/2 top-[48%] z-[1] isolate overflow-hidden"
      style={{ width: 'max(100vw, 177.683vh)', height: 'max(100vh, 56.280vw)', transform: 'translate(-50%, -48%)' }}
      aria-label="Mapa molecular: entrega capilar, difusão intersticial, transporte de membrana e efluxo celular"
    >
      <div className="cellular-flow-depth-plane absolute inset-0 z-[1]" aria-hidden="true"/>
      <Canvas
        style={{ position: 'absolute', inset: 0, zIndex: 2 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Visualização 3D indisponível</div>}
      >
        <OrthographicCamera makeDefault manual position={[0, 0, 10]} left={-BACKGROUND_ASPECT} right={BACKGROUND_ASPECT} top={1} bottom={-1} near={.1} far={100}/>
        <FlowWorld {...props} reducedMotion={reducedMotion}/>
      </Canvas>

      <div className="absolute inset-0 z-10" aria-label="Controles e identificação dos fluxos">
        <CompartmentMap available={props.available} captured={props.captured} running={props.running}/>

        {(Object.keys(props.chips) as SubstrateKind[]).map(kind => {
          const chip = props.chips[kind];
          const [x, y] = flowChipPixels[kind];
          const selected = props.selectedKind === kind;
          return <button
            type="button"
            key={kind}
            className="flow-chip pointer-events-auto"
            data-state={selected ? 'selected' : chip.status}
            aria-pressed={selected}
            aria-label={`${chip.label}: ${chip.value} ${chip.unit}. Estado: ${chip.statusLabel}`}
            title={`${chip.label} · ${chip.value} ${chip.unit} · ${chip.statusLabel}`}
            onClick={() => props.onSelect(kind)}
            style={{ left: `${x / BACKGROUND_WIDTH * 100}%`, top: `${y / BACKGROUND_HEIGHT * 100}%`, '--flow-color': flowMeta[kind].color } as React.CSSProperties}
          >
            <span className="flow-chip-orb" aria-hidden="true"/>
            <span className="min-w-0"><strong>{chip.label}</strong><small>LEC {props.available[kind].toFixed(2)}</small></span>
            <span className="flow-chip-direction" aria-hidden="true">⇢</span>
          </button>;
        })}

        {(Object.keys(transporterPixels) as SubstrateKind[]).map(kind => {
          const meta = flowMeta[kind];
          const [x, y] = transporterPixels[kind];
          const selected = props.selectedKind === kind;
          return <button
            type="button"
            key={`transporter-${kind}`}
            className="flow-transporter-label pointer-events-auto"
            data-selected={selected}
            aria-pressed={selected}
            aria-label={`${meta.molecule}: ${meta.transporter}, ${meta.mechanism}. ${meta.detail}`}
            title={`${meta.transporter} · ${meta.mechanism}. ${meta.detail}`}
            onClick={() => props.onSelect(kind)}
            style={{ left: `${x / BACKGROUND_WIDTH * 100}%`, top: `${y / BACKGROUND_HEIGHT * 100}%`, '--flow-color': meta.color } as React.CSSProperties}
          >
            <span>{mechanismLabels[TRANSPORT_MECHANISMS[kind]]}</span>
            <strong>{meta.transporter}</strong>
          </button>;
        })}

        <FlowAnnotation position={[630, 270]} tone="#78d1dc" title="CANAL IÔNICO · Kv" detail="K⁺ atravessa um poro aquoso; substratos não usam este canal"/>
        <FlowAnnotation position={[665, 612]} tone="#e2a54f" title="LDLR · ENDOCITOSE" detail="LDL → clatrina → vesícula; rota distinta do ácido graxo livre"/>
        <FlowAnnotation position={[730, 744]} tone="#dc6658" title="EXOCITOSE" detail="vesícula funde à membrana e libera resíduos no LEC"/>
        <FlowAnnotation position={[535, 515]} tone="#9db1b7" title="CO₂ · DIFUSÃO PARA FORA" detail="citosol → LEC → sangue, seguindo o gradiente"/>
        <FlowAnnotation position={[550, 625]} tone="#b16ed1" title="MCT4 · EFLUXO" detail="lactato + H⁺ deixam a célula por cotransporte"/>
      </div>
    </div>
  );
}

function CompartmentMap({ available, captured, running }: { available: SubstratePool; captured: SubstratePool; running: boolean }) {
  return <div className="flow-compartment-map" aria-label="Saldos moleculares por compartimento">
    <div><span className="flow-compartment-kicker"><i className="bg-danger"/>Lúmen capilar</span><strong>ENTREGA</strong><small>perfusão sanguínea</small></div>
    <b aria-hidden="true">→</b>
    <div><span className="flow-compartment-kicker"><i className="bg-cyan"/>LEC coletável</span><strong><PoolValue label="Glicose" value={available.glucose}/> · <PoolValue label="AA" value={available.aminoAcid}/></strong><small>{running ? 'difusão abastecendo o saldo' : 'fluxo pausado'}</small></div>
    <b aria-hidden="true">→</b>
    <div><span className="flow-compartment-kicker"><i className="bg-good"/>LIC captado</span><strong><PoolValue label="Glicose" value={captured.glucose}/> · <PoolValue label="AA" value={captured.aminoAcid}/></strong><small>disponível para rotas e reparo</small></div>
  </div>;
}

function PoolValue({ label, value }: { label: string; value: number }) {
  const shortLabel = label === 'Glicose' ? 'GLC' : label.toUpperCase();
  return <span title={`${label}: ${value.toFixed(2)} pacotes`}><span className="flow-pool-label">{shortLabel} </span><em key={value.toFixed(2)}>{value.toFixed(2)}</em></span>;
}

function FlowAnnotation({ position: [x, y], tone, title, detail }: { position: ImagePoint; tone: string; title: string; detail: string }) {
  return <span
    className="flow-annotation"
    tabIndex={0}
    style={{ left: `${x / BACKGROUND_WIDTH * 100}%`, top: `${y / BACKGROUND_HEIGHT * 100}%`, '--flow-color': tone } as React.CSSProperties}
  ><strong>{title}</strong><small>{detail}</small></span>;
}

function FlowWorld({
  available,
  captured,
  wasteLoad,
  oxidativeStress,
  membranePotentialMv,
  perfusionPercent,
  lactateMmolL,
  carbonDioxideMmHg,
  running,
  timeSpeed,
  lastCaptured,
  captureChain,
  captureScore,
  selectedKind,
  reducedMotion,
}: CellularFlowSceneProps & { reducedMotion: boolean }) {
  const perfusionSpeed = Math.max(.45, Math.min(1.55, perfusionPercent / 100));
  return <group>
    {(Object.keys(flowMeta) as SubstrateKind[]).map((kind, index) => {
      const meta = flowMeta[kind];
      const selected = selectedKind === kind;
      const active = lastCaptured === kind;
      return <group key={kind}>
        <MolecularFlow
          kind={kind}
          curve={deliveryCurves[kind]}
          count={calculateDeliveryParticleCount(available[kind], perfusionPercent)}
          maxParticles={MAX_DELIVERY_PARTICLES}
          speed={(kind === 'oxygen' ? .09 : .055 + index * .006) * perfusionSpeed * timeSpeed}
          running={running}
          reducedMotion={reducedMotion}
          fadeStart={.52}
          brownian
          emphasized={selected}
          pathColor={meta.color}
          pathOpacity={selected ? .16 : .045}
          moleculeScale={kind === 'oxygen' ? .74 : .82}
        />
        <MolecularFlow
          kind={kind}
          curve={uptakeCurves[kind]}
          count={calculateUptakeParticleCount(available[kind], captured[kind], active)}
          maxParticles={MAX_UPTAKE_PARTICLES}
          speed={(kind === 'oxygen' ? .11 : .072 + index * .007 + Math.min(5, captureChain) * .006) * timeSpeed}
          running={running}
          reducedMotion={reducedMotion}
          fadeStart={.84}
          emphasized={selected || active}
          burstKey={active ? captureScore : 0}
          pathColor={meta.color}
          pathOpacity={selected ? .22 : .055}
          moleculeScale={kind === 'oxygen' ? .76 : .9}
        />
        <DetailedMembraneTransporter
          kind={kind}
          position={imagePoint(transporterPixels[kind], .24).toArray()}
          rotation={transporterRotations[kind]}
          active={active || (kind === 'oxygen' && running)}
        />
      </group>;
    })}

    <IonChannelModel position={imagePoint([630, 270], .22).toArray()} membranePotentialMv={membranePotentialMv} running={running && !reducedMotion}/>
    <EndocyticVesicle position={imagePoint([640, 610], .25).toArray()} running={running && !reducedMotion} active={selectedKind === 'fattyAcid'}/>
    <ExocyticVesicle position={imagePoint([760, 720], .26).toArray()} running={running && !reducedMotion} activity={wasteLoad}/>
    <EffluxWorld
      wasteLoad={wasteLoad}
      oxidativeStress={oxidativeStress}
      lactateMmolL={lactateMmolL}
      carbonDioxideMmHg={carbonDioxideMmHg}
      running={running}
      reducedMotion={reducedMotion}
      timeSpeed={timeSpeed}
    />
  </group>;
}

function EffluxWorld({ wasteLoad, oxidativeStress, lactateMmolL, carbonDioxideMmHg, running, reducedMotion, timeSpeed }: {
  wasteLoad: number;
  oxidativeStress: number;
  lactateMmolL: number;
  carbonDioxideMmHg: number;
  running: boolean;
  reducedMotion: boolean;
  timeSpeed: number;
}) {
  const co2Curve = useMemo(() => curveFrom([[790, 500], [700, 492], [610, 480], [520, 458], [430, 440]], .16), []);
  const lactateCurve = useMemo(() => curveFrom([[790, 625], [720, 616], [650, 601], [570, 575], [470, 545]], .17), []);
  const wasteCurve = useMemo(() => curveFrom([[760, 720], [700, 718], [640, 700], [580, 677], [510, 650]], .2), []);
  return <group>
    <MolecularFlow
      kind="carbonDioxide"
      curve={co2Curve}
      count={Math.max(2, Math.min(8, Math.round(2 + Math.max(0, carbonDioxideMmHg - 32) / 8)))}
      maxParticles={8}
      speed={(.055 + Math.max(0, carbonDioxideMmHg - 40) * .001) * timeSpeed}
      running={running}
      reducedMotion={reducedMotion}
      fadeStart={.78}
      brownian
      pathColor="#9db1b7"
      pathOpacity={.045}
      moleculeScale={.82}
    />
    <MolecularFlow
      kind="lactate"
      curve={lactateCurve}
      count={Math.max(2, Math.min(8, Math.round(2 + lactateMmolL * .65)))}
      maxParticles={8}
      speed={(.045 + lactateMmolL * .002) * timeSpeed}
      running={running}
      reducedMotion={reducedMotion}
      fadeStart={.8}
      pathColor="#b16ed1"
      pathOpacity={lactateMmolL > 3 ? .12 : .04}
      moleculeScale={.9}
    />
    <MolecularFlow
      kind="waste"
      curve={wasteCurve}
      count={Math.max(1, Math.min(6, Math.round(1 + wasteLoad * .05 + oxidativeStress * .025)))}
      maxParticles={6}
      speed={(.03 + wasteLoad * .0007) * timeSpeed}
      running={running}
      reducedMotion={reducedMotion}
      fadeStart={.68}
      brownian
      emphasized={oxidativeStress > 35}
      pathColor="#dc6658"
      pathOpacity={.055}
      moleculeScale={.88}
    />
  </group>;
}
