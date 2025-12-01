// Popup de conquista desbloqueada
import { Achievement } from '../../game/achievements';
import { useEffect, useState } from 'react';

interface AchievementUnlockPopupProps {
    achievement: Achievement;
    onClose: () => void;
}

export function AchievementUnlockPopup({ achievement, onClose }: AchievementUnlockPopupProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            className={`fixed top-24 right-6 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl p-4 shadow-2xl border-2 border-yellow-400 max-w-sm z-50 transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className="text-5xl animate-bounce">{achievement.icon}</div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-yellow-200 text-sm font-bold">🏆 CONQUISTA DESBLOQUEADA!</span>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-1">{achievement.name}</h3>
                    <p className="text-xs text-yellow-100 mb-2">{achievement.description}</p>
                    <div className="bg-black/30 rounded-lg px-2 py-1 inline-block">
                        <span className="text-xs font-bold text-green-300">
                            +{achievement.reward.amount}{' '}
                            {achievement.reward.type === 'experience' && 'XP'}
                            {achievement.reward.type === 'hormones' && '🧬'}
                            {achievement.reward.type === 'multiplier' && `${((achievement.reward.amount - 1) * 100).toFixed(0)}% Mult.`}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="text-yellow-200 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
