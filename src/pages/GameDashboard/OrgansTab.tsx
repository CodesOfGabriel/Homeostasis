import { Physiology } from '../../game/physiology';
import { LiverTissue } from '../../components/HUD/LiverTissue';
import { KidneyNephrons } from '../../components/HUD/KidneyNephrons';
import { MuscleFibers } from '../../components/HUD/MuscleFibers';
import { NeuronNetwork } from '../../components/HUD/NeuronNetwork';
import { ParameterCard } from '../../components/HUD/ParameterCard';

interface OrgansTabProps {
    parameters: Physiology;
    onOrganClick: (organ: string) => void;
}

export function OrgansTab({ parameters, onOrganClick }: OrgansTabProps) {
    return (
        <div className="grid grid-cols-2 gap-6">
            {/* Liver */}
            <div
                className="bg-white rounded-2xl p-6 border border-orange-200 hover:border-orange-400 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => onOrganClick('liver')}
            >
                <h3 className="text-lg font-semibold text-orange-900 mb-4">Liver Tissue</h3>
                <LiverTissue
                    perfusion={parameters.organsPerfusion}
                    glucose={parameters.glucose}
                    detoxification={100 - parameters.stress}
                />
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <ParameterCard
                        title="Perfusion"
                        value={parameters.organsPerfusion.toFixed(0)}
                        unit="%"
                        color="text-orange-600"
                    />
                    <ParameterCard
                        title="Glucose"
                        value={parameters.glucose.toFixed(0)}
                        unit="mg/dL"
                        color="text-yellow-600"
                    />
                    <ParameterCard
                        title="Detox"
                        value={(100 - parameters.stress).toFixed(0)}
                        unit="%"
                        color="text-green-600"
                    />
                </div>
            </div>

            {/* Kidneys */}
            <div
                className="bg-white rounded-2xl p-6 border border-purple-200 hover:border-purple-400 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => onOrganClick('kidney')}
            >
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Kidney Nephrons</h3>
                <KidneyNephrons
                    perfusion={parameters.organsPerfusion}
                    osmolarity={parameters.osmolarity}
                    filtrationRate={parameters.organsPerfusion}
                />
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <ParameterCard
                        title="Perfusion"
                        value={parameters.organsPerfusion.toFixed(0)}
                        unit="%"
                        color="text-purple-600"
                    />
                    <ParameterCard
                        title="Osmolarity"
                        value={parameters.osmolarity.toFixed(0)}
                        unit="mOsm"
                        color="text-blue-600"
                    />
                    <ParameterCard
                        title="GFR"
                        value={parameters.organsPerfusion.toFixed(0)}
                        unit="%"
                        color="text-cyan-600"
                    />
                </div>
            </div>

            {/* Muscles */}
            <div
                className="bg-white rounded-2xl p-6 border border-red-200 hover:border-red-400 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => onOrganClick('muscle')}
            >
                <h3 className="text-lg font-semibold text-red-900 mb-4">Muscle Fibers</h3>
                <MuscleFibers
                    perfusion={parameters.musclePerfusion}
                    vo2Max={parameters.vo2Max}
                    lactate={parameters.lactate}
                    contractionRate={parameters.heartRate / 60}
                />
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <ParameterCard
                        title="Perfusion"
                        value={parameters.musclePerfusion.toFixed(0)}
                        unit="%"
                        color="text-red-600"
                    />
                    <ParameterCard
                        title="VO₂ Max"
                        value={parameters.vo2Max.toFixed(0)}
                        unit="%"
                        color="text-orange-600"
                    />
                    <ParameterCard
                        title="Lactate"
                        value={parameters.lactate.toFixed(1)}
                        unit="mmol/L"
                        color="text-yellow-600"
                    />
                </div>
            </div>

            {/* Neurons */}
            <div
                className="bg-white rounded-2xl p-6 border border-blue-200 hover:border-blue-400 cursor-pointer transition-all hover:shadow-lg"
                onClick={() => onOrganClick('neuron')}
            >
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Neuron Network</h3>
                <NeuronNetwork
                    brainPerfusion={parameters.brainPerfusion}
                    glucose={parameters.glucose}
                    neurotransmitters={100 - parameters.stress}
                />
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <ParameterCard
                        title="Perfusion"
                        value={parameters.brainPerfusion.toFixed(0)}
                        unit="%"
                        color="text-blue-600"
                    />
                    <ParameterCard
                        title="Glucose"
                        value={parameters.glucose.toFixed(0)}
                        unit="mg/dL"
                        color="text-yellow-600"
                    />
                    <ParameterCard
                        title="Neurotrans"
                        value={(100 - parameters.stress).toFixed(0)}
                        unit="%"
                        color="text-purple-600"
                    />
                </div>
            </div>
        </div>
    );
}
