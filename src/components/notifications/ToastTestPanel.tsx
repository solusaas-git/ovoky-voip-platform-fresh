'use client';

import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationType } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  CreditCard, 
  Phone, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  Shield,
  Settings
} from 'lucide-react';

const testNotifications: Array<{
  type: NotificationType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  icon: React.ReactNode;
  label: string;
  data?: Record<string, unknown>;
}> = [
  {
    type: 'ticket_created',
    priority: 'medium',
    icon: <Bell className="w-4 h-4" />,
    label: 'New Ticket',
    data: { ticketNumber: 'TICK-12345', title: 'Login Issues' }
  },
  {
    type: 'payment_success',
    priority: 'medium',
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Payment Success',
    data: { amount: '150.00', currency: 'USD', paymentId: 'pay_123456' }
  },
  {
    type: 'payment_failed',
    priority: 'high',
    icon: <XCircle className="w-4 h-4" />,
    label: 'Payment Failed',
    data: { amount: '150.00', currency: 'USD', reason: 'Insufficient funds' }
  },
  {
    type: 'low_balance',
    priority: 'high',
    icon: <CreditCard className="w-4 h-4" />,
    label: 'Low Balance',
    data: { balance: '5.50', currency: 'USD', threshold: '10.00' }
  },
  {
    type: 'zero_balance',
    priority: 'urgent',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Zero Balance',
    data: { balance: '0.00', currency: 'USD' }
  },
  {
    type: 'phone_number_approved',
    priority: 'medium',
    icon: <Phone className="w-4 h-4" />,
    label: 'Phone Approved',
    data: { phoneNumber: '+1-555-0123', country: 'US' }
  },
  {
    type: 'security_alert',
    priority: 'urgent',
    icon: <Shield className="w-4 h-4" />,
    label: 'Security Alert',
    data: { message: 'New login from unrecognized device', location: 'New York, US' }
  },
  {
    type: 'system_maintenance',
    priority: 'medium',
    icon: <Settings className="w-4 h-4" />,
    label: 'Maintenance',
    data: { message: 'Scheduled maintenance tonight', duration: '2 hours' }
  },
  {
    type: 'admin_alert',
    priority: 'high',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Admin Alert',
    data: { message: 'System resource usage high', level: '85%' }
  },
  {
    type: 'call_quality_alert',
    priority: 'high',
    icon: <Info className="w-4 h-4" />,
    label: 'Call Quality',
    data: { message: 'Poor call quality detected', route: 'US-East' }
  }
];

export default function ToastTestPanel() {
  const { testNotification } = useNotifications();

  const handleTestToast = async (notification: typeof testNotifications[0]) => {
    try {
      await testNotification(notification.type);
    } catch (error) {
      console.error('Error showing test notification:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50 hover:bg-red-100 text-red-700';
      case 'high':
        return 'border-orange-500 bg-orange-50 hover:bg-orange-100 text-orange-700';
      case 'medium':
        return 'border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700';
      case 'low':
        return 'border-gray-500 bg-gray-50 hover:bg-gray-100 text-gray-700';
      default:
        return 'border-gray-500 bg-gray-50 hover:bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Sophisticated Toast Notifications
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Test the advanced notification toast system with different types and priorities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testNotifications.map((notification, index) => (
          <Button
            key={index}
            onClick={() => handleTestToast(notification)}
            variant="outline"
            className={`p-4 h-auto flex flex-col items-center gap-2 border-2 transition-all duration-200 ${getPriorityColor(notification.priority)}`}
          >
            <div className="flex items-center gap-2">
              {notification.icon}
              <span className="font-medium">{notification.label}</span>
            </div>
            <span className="text-xs uppercase font-semibold tracking-wide">
              {notification.priority}
            </span>
            <span className="text-xs opacity-75 text-center">
              {notification.type.replace(/_/g, ' ')}
            </span>
          </Button>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Toast Features:
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Large, sophisticated design (400-500px wide)</li>
          <li>• Priority-based styling and icons</li>
          <li>• Animated progress bar with auto-dismiss</li>
          <li>• Hover to pause, beautiful glassmorphism effect</li>
          <li>• Action buttons for notifications with URLs</li>
          <li>• Contextual data display in expandable sections</li>
          <li>• Smooth spring animations with slide effects</li>
          <li>• Dark/light mode support</li>
          <li>• Multiple position support</li>
          <li>• Queue management (max 5 toasts)</li>
        </ul>
      </div>
    </div>
  );
} 