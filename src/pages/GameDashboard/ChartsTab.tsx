import { Physiology } from '../../game/physiology';
import { RealTimeChart } from '../../components/HUD/RealTimeChart';

interface ChartsTabProps {
    parameters: Physiology;
}

export function ChartsTab({ parameters }: ChartsTabProps) {
    return (
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <RealTimeChart
                    title="Heart Rate"
                    currentValue={parameters.heartRate}
                    unit="BPM"
                    color="#EF4444"
                    min={40}
                    max={180}
                />
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <RealTimeChart
                    title="Oxygen Saturation"
                    currentValue={parameters.bloodOxygen}
                    unit="%"
                    color="#06B6D4"
                    min={70}
                    max={100}
                />
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <RealTimeChart
                    title="Blood Glucose"
                    currentValue={parameters.glucose}
                    unit="mg/dL"
                    color="#FBBF24"
                    min={40}
                    max={200}
                />
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <RealTimeChart
                    title="Lactate"
                    currentValue={parameters.lactate}
                    unit="mmol/L"
                    color="#F97316"
                    min={0}
                    max={5}
                />
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <RealTimeChart
                    title="Cortisol"
                    currentValue={parameters.cortisol}
                    unit="mcg/dL"
                    color="#A855F7"
                    min={0}
                    max={100}
                />
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <RealTimeChart
                    title="Blood pH"
                    currentValue={parameters.pH}
                    unit=""
                    color="#06B6D4"
                    min={7.0}
                    max={7.8}
                />
            </div>
        </div>
    );
}
