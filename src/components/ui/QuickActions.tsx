import React from 'react';
import { motion } from 'framer-motion';
import { Play, Activity, FileText, DivideIcon as LucideIcon } from 'lucide-react';

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  color: 'blue' | 'green' | 'purple';
  delay?: number;
}

const QuickAction: React.FC<QuickActionProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  color, 
  delay = 0 
}) => {
  const colorClasses = {
    blue: 'hover:bg-blue-50 hover:border-blue-200 group-hover:text-blue-600',
    green: 'hover:bg-emerald-50 hover:border-emerald-200 group-hover:text-emerald-600',
    purple: 'hover:bg-purple-50 hover:border-purple-200 group-hover:text-purple-600'
  };

  const iconClasses = {
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
    green: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:border-gray-800 dark:bg-gray-900 ${colorClasses[color]}`}
    >
      <div className="flex items-start space-x-4">
        <div className={`rounded-lg p-2 transition-colors duration-200 ${iconClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-gray-900 transition-colors duration-200 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 transition-colors duration-200 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.button>
  );
};

const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'Run All Tests',
      description: 'Execute the complete test suite across all categories',
      icon: Play,
      color: 'blue' as const,
      onClick: () => console.log('Run all tests'),
      delay: 0.1
    },
    {
      title: 'Health Check',
      description: 'Verify all services and connections are operational',
      icon: Activity,
      color: 'green' as const,
      onClick: () => console.log('Health check'),
      delay: 0.2
    },
    {
      title: 'Generate Report',
      description: 'Export comprehensive test results and analytics',
      icon: FileText,
      color: 'purple' as const,
      onClick: () => console.log('Generate report'),
      delay: 0.3
    }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action, index) => (
        <QuickAction key={index} {...action} />
      ))}
    </div>
  );
};

export default QuickActions;