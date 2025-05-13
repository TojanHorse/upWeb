import React from 'react';
import { motion } from 'framer-motion';
import { ActivitySquare } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-dark-950 flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ 
            rotate: 360,
            borderRadius: ["20%", "20%", "50%", "50%", "20%"]
          }}
          transition={{ 
            duration: 2,
            ease: "linear",
            repeat: Infinity
          }}
          className="relative mb-6"
        >
          <ActivitySquare size={64} className="text-primary-500" />
          <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 opacity-30 blur-lg" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-bold text-white mb-2"
        >
          upWeb
        </motion.h1>
        
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 200 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          className="h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 rounded-full"
        />
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-4 text-dark-400"
        >
          Loading...
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;