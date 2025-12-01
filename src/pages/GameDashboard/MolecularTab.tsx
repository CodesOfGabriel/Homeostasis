import { Physiology } from '../../game/physiology';
import { MolecularPathway } from '../../components/HUD/MolecularPathway';
import { MolecularPathways } from '../../components/HUD/MolecularPathways';
import { ParameterCard } from '../../components/HUD/ParameterCard';

interface MolecularTabProps {
    parameters: Physiology;
}

export function MolecularTab({ parameters }: MolecularTabProps) {
    return (
        <div className="space-y-6">
            {/* Main Pathways */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-cyan-200">
                    <MolecularPathway
                        pathwayName="AMPK"
                        activity={parameters.ampk}
                        color="cyan"
                        nodes={[
                            { id: 'amp', label: 'AMP/ATP', active: parameters.ampk > 50, position: { x: 40, y: 100 } },
                            { id: 'lkb1', label: 'LKB1', active: parameters.ampk > 60, position: { x: 120, y: 80 } },
                            { id: 'ampk', label: 'AMPK', active: parameters.ampk > 70, position: { x: 200, y: 100 } },
                            { id: 'ppar', label: 'PPARα', active: parameters.ampk > 80, position: { x: 280, y: 80 } },
                            { id: 'pgc1', label: 'PGC-1α', active: parameters.ampk > 85, position: { x: 360, y: 100 } },
                        ]}
                    />
                </div>
                <div className="bg-white rounded-2xl p-6 border border-purple-200">
                    <MolecularPathway
                        pathwayName="mTOR"
                        activity={parameters.mtor}
                        color="purple"
                        nodes={[
                            { id: 'insulin', label: 'Insulin', active: parameters.mtor > 50, position: { x: 40, y: 100 } },
                            { id: 'pi3k', label: 'PI3K', active: parameters.mtor > 60, position: { x: 120, y: 80 } },
                            { id: 'akt', label: 'AKT', active: parameters.mtor > 70, position: { x: 200, y: 100 } },
                            { id: 'mtor', label: 'mTOR', active: parameters.mtor > 80, position: { x: 280, y: 80 } },
                            { id: 's6k', label: 'S6K', active: parameters.mtor > 85, position: { x: 360, y: 100 } },
                        ]}
                    />
                </div>
            </div>

            {/* All Pathways Overview */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">Metabolic Pathways</h3>
                <MolecularPathways
                    nrf2={parameters.nrf2}
                    mtor={parameters.mtor}
                    ampk={parameters.ampk}
                    nfkb={parameters.nfkb}
                />
            </div>

            {/* Pathway Metrics */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <ParameterCard
                        title="NRF2"
                        value={parameters.nrf2.toFixed(0)}
                        unit="%"
                        color="text-green-600"
                    />
                    <p className="text-xs text-gray-500 mt-2">Antioxidant Response</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <ParameterCard
                        title="mTOR"
                        value={parameters.mtor.toFixed(0)}
                        unit="%"
                        color="text-purple-600"
                    />
                    <p className="text-xs text-gray-500 mt-2">Growth & Anabolism</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <ParameterCard
                        title="AMPK"
                        value={parameters.ampk.toFixed(0)}
                        unit="%"
                        color="text-cyan-600"
                    />
                    <p className="text-xs text-gray-500 mt-2">Energy Sensor</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <ParameterCard
                        title="NF-κB"
                        value={parameters.nfkb.toFixed(0)}
                        unit="%"
                        color="text-red-600"
                    />
                    <p className="text-xs text-gray-500 mt-2">Inflammatory Response</p>
                </div>
            </div>
        </div>
    );
}
