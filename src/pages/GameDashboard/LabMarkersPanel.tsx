import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Physiology } from '../../game/physiology';

interface LabMarkersPanelProps {
    parameters: Physiology;
}

interface MarkerProps {
    label: string;
    value: number | string;
    unit: string;
    normalRange: string;
    isAbnormal?: boolean;
}

function LabMarker({ label, value, unit, normalRange, isAbnormal }: MarkerProps) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-xs text-gray-400 ml-2">({normalRange})</span>
            </div>
            <div className={`text-sm font-bold ${isAbnormal ? 'text-red-600' : 'text-gray-900'}`}>
                {typeof value === 'number' ? value.toFixed(1) : value} <span className="text-xs font-normal text-gray-500">{unit}</span>
            </div>
        </div>
    );
}

interface SectionProps {
    title: string;
    icon: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function LabSection({ title, icon, children, defaultOpen = false }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <span className="font-semibold text-gray-900">{title}</span>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
            </button>
            {isOpen && (
                <div className="px-4 py-3">
                    {children}
                </div>
            )}
        </div>
    );
}

export function LabMarkersPanel({ parameters }: LabMarkersPanelProps) {
    return (
        <div className="space-y-3">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Marcadores Laboratoriais</h2>

            {/* Respiratory Markers */}
            <LabSection title="Gasometria Arterial" icon="💨" defaultOpen={true}>
                <LabMarker
                    label="pH"
                    value={parameters.pH}
                    unit=""
                    normalRange="7.35-7.45"
                    isAbnormal={parameters.pH < 7.35 || parameters.pH > 7.45}
                />
                <LabMarker
                    label="pO₂"
                    value={parameters.pO2}
                    unit="mmHg"
                    normalRange="80-100"
                    isAbnormal={parameters.pO2 < 80}
                />
                <LabMarker
                    label="pCO₂"
                    value={parameters.pCO2}
                    unit="mmHg"
                    normalRange="35-45"
                    isAbnormal={parameters.pCO2 < 35 || parameters.pCO2 > 45}
                />
                <LabMarker
                    label="HCO₃⁻"
                    value={parameters.hco3}
                    unit="mEq/L"
                    normalRange="22-26"
                    isAbnormal={parameters.hco3 < 22 || parameters.hco3 > 26}
                />
                <LabMarker
                    label="Base Excess"
                    value={parameters.baseExcess}
                    unit="mEq/L"
                    normalRange="-2 a +2"
                    isAbnormal={Math.abs(parameters.baseExcess) > 2}
                />
                <LabMarker
                    label="SpO₂"
                    value={parameters.bloodOxygen}
                    unit="%"
                    normalRange="95-100"
                    isAbnormal={parameters.bloodOxygen < 95}
                />
            </LabSection>

            {/* Lipid Profile */}
            <LabSection title="Perfil Lipídico" icon="🧈">
                <LabMarker
                    label="Colesterol Total"
                    value={parameters.totalCholesterol}
                    unit="mg/dL"
                    normalRange="<200"
                    isAbnormal={parameters.totalCholesterol >= 200}
                />
                <LabMarker
                    label="LDL (Ruim)"
                    value={parameters.ldl}
                    unit="mg/dL"
                    normalRange="<100"
                    isAbnormal={parameters.ldl >= 100}
                />
                <LabMarker
                    label="HDL (Bom)"
                    value={parameters.hdl}
                    unit="mg/dL"
                    normalRange=">40"
                    isAbnormal={parameters.hdl < 40}
                />
                <LabMarker
                    label="Triglicerídeos"
                    value={parameters.triglycerides}
                    unit="mg/dL"
                    normalRange="<150"
                    isAbnormal={parameters.triglycerides >= 150}
                />
                <LabMarker
                    label="VLDL"
                    value={parameters.vldl}
                    unit="mg/dL"
                    normalRange="<30"
                    isAbnormal={parameters.vldl >= 30}
                />
            </LabSection>

            {/* Hepatic Profile */}
            <LabSection title="Função Hepática" icon="🫀">
                <LabMarker
                    label="ALT (TGP)"
                    value={parameters.alt}
                    unit="U/L"
                    normalRange="7-56"
                    isAbnormal={parameters.alt > 56}
                />
                <LabMarker
                    label="AST (TGO)"
                    value={parameters.ast}
                    unit="U/L"
                    normalRange="10-40"
                    isAbnormal={parameters.ast > 40}
                />
                <LabMarker
                    label="Fosfatase Alcalina"
                    value={parameters.alp}
                    unit="U/L"
                    normalRange="44-147"
                    isAbnormal={parameters.alp < 44 || parameters.alp > 147}
                />
                <LabMarker
                    label="GGT"
                    value={parameters.ggt}
                    unit="U/L"
                    normalRange="9-48"
                    isAbnormal={parameters.ggt > 48}
                />
                <LabMarker
                    label="Bilirrubina Total"
                    value={parameters.bilirubin}
                    unit="mg/dL"
                    normalRange="0.1-1.2"
                    isAbnormal={parameters.bilirubin > 1.2}
                />
                <LabMarker
                    label="Albumina"
                    value={parameters.albumin}
                    unit="g/dL"
                    normalRange="3.5-5.5"
                    isAbnormal={parameters.albumin < 3.5 || parameters.albumin > 5.5}
                />
                <LabMarker
                    label="Proteínas Totais"
                    value={parameters.totalProtein}
                    unit="g/dL"
                    normalRange="6.0-8.3"
                    isAbnormal={parameters.totalProtein < 6.0 || parameters.totalProtein > 8.3}
                />
            </LabSection>

            {/* Renal Profile */}
            <LabSection title="Função Renal" icon="🫘">
                <LabMarker
                    label="Creatinina"
                    value={parameters.creatinine}
                    unit="mg/dL"
                    normalRange="0.7-1.3"
                    isAbnormal={parameters.creatinine < 0.7 || parameters.creatinine > 1.3}
                />
                <LabMarker
                    label="Ureia"
                    value={parameters.urea}
                    unit="mg/dL"
                    normalRange="15-45"
                    isAbnormal={parameters.urea < 15 || parameters.urea > 45}
                />
                <LabMarker
                    label="BUN"
                    value={parameters.bun}
                    unit="mg/dL"
                    normalRange="7-20"
                    isAbnormal={parameters.bun < 7 || parameters.bun > 20}
                />
                <LabMarker
                    label="TFG (eGFR)"
                    value={parameters.gfr}
                    unit="mL/min/1.73m²"
                    normalRange=">90"
                    isAbnormal={parameters.gfr < 90}
                />
                <LabMarker
                    label="Ácido Úrico"
                    value={parameters.uricAcid}
                    unit="mg/dL"
                    normalRange="3.5-7.2"
                    isAbnormal={parameters.uricAcid < 3.5 || parameters.uricAcid > 7.2}
                />
            </LabSection>

            {/* Complete Blood Count */}
            <LabSection title="Hemograma Completo" icon="🩸">
                <LabMarker
                    label="Hemoglobina"
                    value={parameters.hemoglobin}
                    unit="g/dL"
                    normalRange="13.5-17.5"
                    isAbnormal={parameters.hemoglobin < 13.5 || parameters.hemoglobin > 17.5}
                />
                <LabMarker
                    label="Hematócrito"
                    value={parameters.hematocrit}
                    unit="%"
                    normalRange="38-50"
                    isAbnormal={parameters.hematocrit < 38 || parameters.hematocrit > 50}
                />
                <LabMarker
                    label="Hemácias (RBC)"
                    value={parameters.rbc}
                    unit="milhões/μL"
                    normalRange="4.5-5.5"
                    isAbnormal={parameters.rbc < 4.5 || parameters.rbc > 5.5}
                />
                <LabMarker
                    label="Leucócitos (WBC)"
                    value={parameters.wbc}
                    unit="mil/μL"
                    normalRange="4.5-11.0"
                    isAbnormal={parameters.wbc < 4.5 || parameters.wbc > 11.0}
                />
                <LabMarker
                    label="Plaquetas"
                    value={parameters.platelets}
                    unit="mil/μL"
                    normalRange="150-400"
                    isAbnormal={parameters.platelets < 150 || parameters.platelets > 400}
                />
            </LabSection>

            {/* Inflammatory Markers */}
            <LabSection title="Marcadores Inflamatórios" icon="🔥">
                <LabMarker
                    label="Proteína C Reativa"
                    value={parameters.crp}
                    unit="mg/L"
                    normalRange="<3.0"
                    isAbnormal={parameters.crp >= 3.0}
                />
                <LabMarker
                    label="VHS (ESR)"
                    value={parameters.esr}
                    unit="mm/h"
                    normalRange="<20"
                    isAbnormal={parameters.esr >= 20}
                />
            </LabSection>

            {/* Electrolytes */}
            <LabSection title="Eletrólitos" icon="⚡">
                <LabMarker
                    label="Sódio (Na⁺)"
                    value={parameters.sodium}
                    unit="mEq/L"
                    normalRange="136-145"
                    isAbnormal={parameters.sodium < 136 || parameters.sodium > 145}
                />
                <LabMarker
                    label="Potássio (K⁺)"
                    value={parameters.potassium}
                    unit="mEq/L"
                    normalRange="3.5-5.0"
                    isAbnormal={parameters.potassium < 3.5 || parameters.potassium > 5.0}
                />
                <LabMarker
                    label="Cálcio (Ca²⁺)"
                    value={parameters.calcium}
                    unit="mg/dL"
                    normalRange="8.5-10.5"
                    isAbnormal={parameters.calcium < 8.5 || parameters.calcium > 10.5}
                />
                <LabMarker
                    label="Cloro (Cl⁻)"
                    value={parameters.chloride}
                    unit="mEq/L"
                    normalRange="96-106"
                    isAbnormal={parameters.chloride < 96 || parameters.chloride > 106}
                />
                <LabMarker
                    label="Magnésio (Mg²⁺)"
                    value={parameters.magnesium}
                    unit="mg/dL"
                    normalRange="1.7-2.2"
                    isAbnormal={parameters.magnesium < 1.7 || parameters.magnesium > 2.2}
                />
                <LabMarker
                    label="Fósforo (P)"
                    value={parameters.phosphorus}
                    unit="mg/dL"
                    normalRange="2.5-4.5"
                    isAbnormal={parameters.phosphorus < 2.5 || parameters.phosphorus > 4.5}
                />
            </LabSection>

            {/* Metabolic */}
            <LabSection title="Marcadores Metabólicos" icon="⚗️">
                <LabMarker
                    label="Glicose"
                    value={parameters.glucose}
                    unit="mg/dL"
                    normalRange="70-100"
                    isAbnormal={parameters.glucose < 70 || parameters.glucose > 100}
                />
                <LabMarker
                    label="Lactato"
                    value={parameters.lactate}
                    unit="mmol/L"
                    normalRange="0.5-2.2"
                    isAbnormal={parameters.lactate > 2.2}
                />
                <LabMarker
                    label="Osmolaridade"
                    value={parameters.osmolarity}
                    unit="mOsm/L"
                    normalRange="275-295"
                    isAbnormal={parameters.osmolarity < 275 || parameters.osmolarity > 295}
                />
            </LabSection>
        </div>
    );
}
