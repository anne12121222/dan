import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from './common/Icons.tsx';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const NotificationComponent: React.FC<NotificationProps> = ({ message, type, onClose, duration = 4000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); 
    }, duration);

    return () => clearTimeout(timer);
  }, [message, type, duration, onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const icon = type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />;

  return (
    <div
      className={`fixed bottom-5 right-5 ${bgColor} text-white p-4 rounded-lg shadow-lg flex items-center space-x-3 z-50 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {icon}
      <span>{message}</span>
    </div>
  );
};

export default NotificationComponent;