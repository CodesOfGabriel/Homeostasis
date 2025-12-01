import { DetailModal } from '../../components/HUD/DetailModal';
import { LiverTissue } from '../../components/HUD/LiverTissue';
import { KidneyNephrons } from '../../components/HUD/KidneyNephrons';
import { MuscleFibers } from '../../components/HUD/MuscleFibers';
import { NeuronNetwork } from '../../components/HUD/NeuronNetwork';
import { Physiology } from '../../game/physiology';

interface OrganModalsProps {
    selectedOrgan: string | null;
    parameters: Physiology;
    onClose: () => void;
}

export function OrganModals({ selectedOrgan, parameters, onClose }: OrganModalsProps) {
    return (
        <>
            {/* Liver Modal */}
            <DetailModal
                isOpen={selectedOrgan === 'liver'}
                onClose={onClose}
                title="LIVER TISSUE - Detailed Analysis"
            >
                <div className="grid grid-cols-2 gap-6">
                    <LiverTissue
                        perfusion={parameters.organsPerfusion}
                        glucose={parameters.glucose}
                        detoxification={100 - parameters.stress}
                    />
                    <div>
                        <h4 className="text-orange-600 font-bold mb-4 text-xl">Hepatic Functions</h4>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• Glucose metabolism and glycogen storage</li>
                            <li>• Protein synthesis and albumin production</li>
                            <li>• Bile production for fat digestion</li>
                            <li>• Detoxification of metabolic waste</li>
                            <li>• Blood clotting factor synthesis</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>

            {/* Kidney Modal */}
            <DetailModal
                isOpen={selectedOrgan === 'kidney'}
                onClose={onClose}
                title="KIDNEY NEPHRONS - Detailed Analysis"
            >
                <div className="grid grid-cols-2 gap-6">
                    <KidneyNephrons
                        perfusion={parameters.organsPerfusion}
                        osmolarity={parameters.osmolarity}
                        filtrationRate={parameters.organsPerfusion}
                    />
                    <div>
                        <h4 className="text-purple-600 font-bold mb-4 text-xl">Renal Functions</h4>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• Blood filtration and waste removal</li>
                            <li>• Electrolyte balance regulation</li>
                            <li>• Blood pressure control via RAAS</li>
                            <li>• Acid-base balance maintenance</li>
                            <li>• Erythropoietin production</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>

            {/* Muscle Modal */}
            <DetailModal
                isOpen={selectedOrgan === 'muscle'}
                onClose={onClose}
                title="MUSCLE FIBERS - Detailed Analysis"
            >
                <div className="grid grid-cols-2 gap-6">
                    <MuscleFibers
                        perfusion={parameters.musclePerfusion}
                        vo2Max={parameters.vo2Max}
                        lactate={parameters.lactate}
                        contractionRate={parameters.heartRate / 60}
                    />
                    <div>
                        <h4 className="text-red-600 font-bold mb-4 text-xl">Muscle Physiology</h4>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• Aerobic and anaerobic metabolism</li>
                            <li>• Glucose uptake and glycogen storage</li>
                            <li>• Lactate production during exercise</li>
                            <li>• Mitochondrial oxidative capacity</li>
                            <li>• Myokine secretion (endocrine function)</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>

            {/* Neuron Modal */}
            <DetailModal
                isOpen={selectedOrgan === 'neuron'}
                onClose={onClose}
                title="NEURON NETWORK - Detailed Analysis"
            >
                <div className="grid grid-cols-2 gap-6">
                    <NeuronNetwork
                        brainPerfusion={parameters.brainPerfusion}
                        glucose={parameters.glucose}
                        neurotransmitters={100 - parameters.stress}
                    />
                    <div>
                        <h4 className="text-blue-600 font-bold mb-4 text-xl">Neural Functions</h4>
                        <ul className="text-sm text-gray-700 space-y-2">
                            <li>• Neurotransmitter synthesis and release</li>
                            <li>• High metabolic demand (20% glucose)</li>
                            <li>• Synaptic plasticity and learning</li>
                            <li>• Autonomic nervous system control</li>
                            <li>• Neuroendocrine regulation</li>
                        </ul>
                    </div>
                </div>
            </DetailModal>
        </>
    );
}
