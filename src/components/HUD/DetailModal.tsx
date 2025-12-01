// DetailModal: Modal for detailed organ/system visualization

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export function DetailModal({
    isOpen,
    onClose,
    title,
    children,
}: DetailModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black bg-opacity-80 z-40"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-8"
                    >
                        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-cyan-500 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-cyan-500">
                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                    {title}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-white text-3xl font-bold transition-colors"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {children}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end p-6 border-t border-cyan-500">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-semibold hover:shadow-lg transition-all"
                                >
                                    Close HUD
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
