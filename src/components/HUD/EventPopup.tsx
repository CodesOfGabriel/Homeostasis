// EventPopup: displays narrative events like Plague Inc

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface EventPopupProps {
  title: string;
  description: string;
  onClose: () => void;
  autoCloseDelay?: number;
}

export function EventPopup({
  title,
  description,
  onClose,
  autoCloseDelay = 5000,
}: EventPopupProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, autoCloseDelay);
    return () => clearTimeout(timer);
  }, [onClose, autoCloseDelay]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="bg-neuro-dark border-2 border-neuro-purple rounded-lg p-4 shadow-2xl max-w-md"
        style={{
          boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-purple-400 mb-2">{title}</h3>
            <p className="text-sm text-gray-300">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
