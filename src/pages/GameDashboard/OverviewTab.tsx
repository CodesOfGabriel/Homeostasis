import { Heart, Droplet, Wind, Thermometer, Activity } from 'lucide-react';
import { Physiology } from '../../game/physiology';
import { BiomedicCard } from '../../components/HUD/BiomedicCard';
import { ParameterCard } from '../../components/HUD/ParameterCard';
import { AnatomicalBody } from '../../components/HUD/AnatomicalBody';
import { AnatomicalHeart } from '../../components/HUD/AnatomicalHeart';
import { Circulation } from '../../components/HUD/Circulation';

interface OverviewTabProps {
    parameters: Physiology;
}

export function OverviewTab({ parameters }: OverviewTabProps) {
    return (
        <div className="space-y-6">
            {/* Primary Vitals - 4 Cards */}
            <div className="grid grid-cols-4 gap-4">
                <BiomedicCard
                    title="Heart Rate"
                    value={parameters.heartRate}
                    unit="BPM"
                    icon={<Heart className="w-5 h-5" />}
                    color="text-red-500"
                    subtitle="Cardiac Output"
                    warning={parameters.heartRate > 120 || parameters.heartRate < 50}
                    pulseRate={parameters.heartRate}
                />
                <BiomedicCard
                    title="Blood Glucose"
                    value={parameters.glucose}
                    unit="mg/dL"
                    icon={<Droplet className="w-5 h-5" />}
                    color="text-yellow-500"
                    subtitle="Blood Sugar"
                    warning={parameters.glucose < 70 || parameters.glucose > 180}
                />
                <BiomedicCard
                    title="O₂ Saturation"
                    value={parameters.bloodOxygen.toFixed(0)}
                    unit="%"
                    icon={<Wind className="w-5 h-5" />}
                    color="text-blue-500"
                    subtitle="SpO₂ Level"
                    warning={parameters.bloodOxygen < 90}
                    pulseRate={parameters.respiratoryRate}
                />
                <BiomedicCard
                    title="Temperature"
                    value={parameters.temperature}
                    unit="°C"
                    icon={<Thermometer className="w-5 h-5" />}
                    color="text-orange-500"
                    subtitle="Core Temp"
                    warning={parameters.temperature > 38 || parameters.temperature < 36}
                />
            </div>

            {/* Main Content - Body + Heart */}
            <div className="grid grid-cols-2 gap-6">
                {/* Anatomical Body */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Body Condition</h3>
                    <AnatomicalBody
                        heartRate={parameters.heartRate}
                        respiratoryRate={parameters.respiratoryRate}
                        venousPerfusion={parameters.organsPerfusion}
                        arterialPerfusion={parameters.musclePerfusion}
                    />
                </div>

                {/* Heart Details */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Heart Analysis</h3>
                    <AnatomicalHeart
                        heartRate={parameters.heartRate}
                        perfusion={parameters.heartPerfusion}
                        bloodOxygen={parameters.bloodOxygen}
                    />
                </div>
            </div>

            {/* Circulation */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Systemic Circulation
                </h3>
                <div className="h-[150px]">
                    <Circulation
                        cardiacOutput={parameters.cardiacOutput}
                        bloodOxygen={parameters.bloodOxygen}
                    />
                </div>
            </div>

            {/* Hormones Grid */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Neuro-Hormonal Panel</h3>
                <div className="grid grid-cols-4 gap-4">
                    <ParameterCard
                        title="Cortisol"
                        value={parameters.cortisol.toFixed(1)}
                        unit="mcg/dL"
                        color="text-purple-600"
                        warning={parameters.cortisol > 80}
                    />
                    <ParameterCard
                        title="Adrenaline"
                        value={parameters.adrenaline.toFixed(1)}
                        unit="pg/mL"
                        color="text-red-600"
                        warning={parameters.adrenaline > 80}
                    />
                    <ParameterCard
                        title="Insulin"
                        value={parameters.insulin.toFixed(1)}
                        unit="mU/L"
                        color="text-blue-600"
                    />
                    <ParameterCard
                        title="Growth Hormone"
                        value={parameters.growthHormone.toFixed(1)}
                        unit="ng/mL"
                        color="text-green-600"
                    />
                    <ParameterCard
                        title="Glucagon"
                        value={parameters.glucagon.toFixed(1)}
                        unit="pg/mL"
                        color="text-orange-600"
                    />
                    <ParameterCard
                        title="Dopamine"
                        value={parameters.dopamine.toFixed(1)}
                        unit="pg/mL"
                        color="text-pink-600"
                    />
                    <ParameterCard
                        title="Serotonin"
                        value={parameters.serotonin.toFixed(1)}
                        unit="ng/mL"
                        color="text-indigo-600"
                    />
                    <ParameterCard
                        title="Melatonin"
                        value={parameters.melatonin.toFixed(1)}
                        unit="pg/mL"
                        color="text-violet-600"
                    />
                </div>
            </div>

            {/* Electrolytes */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Electrolytes</h3>
                <div className="grid grid-cols-4 gap-4">
                    <ParameterCard
                        title="Sodium"
                        value={parameters.sodium.toFixed(0)}
                        unit="mmol/L"
                        color="text-yellow-600"
                        warning={parameters.sodium > 145 || parameters.sodium < 135}
                    />
                    <ParameterCard
                        title="Potassium"
                        value={parameters.potassium.toFixed(1)}
                        unit="mmol/L"
                        color="text-orange-600"
                        warning={parameters.potassium > 5.0 || parameters.potassium < 3.5}
                    />
                    <ParameterCard
                        title="Calcium"
                        value={parameters.calcium.toFixed(1)}
                        unit="mmol/L"
                        color="text-green-600"
                    />
                    <ParameterCard
                        title="pH"
                        value={parameters.pH.toFixed(2)}
                        unit=""
                        color="text-cyan-600"
                        warning={parameters.pH < 7.35 || parameters.pH > 7.45}
                    />
                </div>
            </div>
        </div>
    );
}
