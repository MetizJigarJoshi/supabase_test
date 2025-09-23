import React from 'react';

interface TestCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow';
  subtitle?: string;
}

const TestCard: React.FC<TestCardProps> = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'gradient-primary text-white',
    green: 'gradient-success text-white',
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
    yellow: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white'
  };

  return (
    <div className={`card p-6 ${colorClasses[color]} transform hover:scale-105 transition-all`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
        </div>
        <div className="flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default TestCard;