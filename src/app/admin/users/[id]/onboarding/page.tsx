'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  User, 
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Save,
  X,
  Shield,
  Mail,
  Hash,
  Building2,
  Phone,
  Target,
  BarChart3,
  Calendar,
  Sparkles,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { UserOnboarding } from '@/models/UserOnboarding';
import { AdminOnboardingForm } from '@/components/onboarding/AdminOnboardingForm';
import { useBranding } from '@/hooks/useBranding';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  sippyAccountId?: number;
  isEmailVerified: boolean;
  createdAt: string;
}

export default function UserOnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { } = useBranding();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [onboarding, setOnboarding] = useState<UserOnboarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [approved, setApproved] = useState<boolean | undefined>(undefined);

  const fetchOnboardingData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/onboarding/${userId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch onboarding data');
      }
      
      const data = await response.json();
      setUser(data.user);
      setOnboarding(data.onboarding);
      setApproved(data.onboarding?.approved);
      setAdminNotes(data.onboarding?.adminNotes || '');
    } catch (error) {
      console.error('Error fetching onboarding data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load onboarding data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchOnboardingData();
    }
  }, [userId, fetchOnboardingData]);

  const handleSaveReview = async () => {
    try {
      const response = await fetch(`/api/admin/onboarding/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          adminNotes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save review');
      }

      toast.success('Review saved successfully');
      setIsEditingReview(false);
      fetchOnboardingData(); // Refresh data
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save review');
    }
  };

  const getApprovalStatus = () => {
    if (approved === true) return { label: 'Approved', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle };
    if (approved === false) return { label: 'Rejected', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: XCircle };
    return { label: 'Pending Review', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', icon: Clock };
  };



  const getServiceLabel = (service: string) => {
    const labels: Record<string, string> = {
      outbound_calls: 'Outbound Calls',
      inbound_calls: 'Inbound Calls',
      did_numbers: 'DID Numbers (SDA)',
      sms: 'SMS Services',
      emailing: 'Email Marketing',
      whatsapp_business: 'WhatsApp Business API',
      other: 'Other Services'
    };
    return labels[service] || service;
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen bg-gray-50 dark:bg-gray-900"
      >
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
      >
        <Card className="max-w-md w-full mx-4 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
          <CardContent className="text-center py-12">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
      >
        <Card className="max-w-md w-full mx-4 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2 text-black dark:text-white">User Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">The requested user could not be found.</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvalStatus = getApprovalStatus();
  const StatusIcon = approvalStatus.icon;

  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={() => router.back()} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-black dark:bg-white text-white dark:text-black"
                >
                  <Sparkles className="h-4 w-4" />
                  User Onboarding
                </div>
              </div>
              <h1 
                className="text-2xl md:text-3xl font-bold text-black dark:text-white"
              >
                {user.name}&apos;s Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Review and manage onboarding information</p>
            </div>
          </div>
        </div>

        {/* User Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card 
            className="lg:col-span-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                >
                  <User className="h-4 w-4 text-black dark:text-white" />
                </div>
                <span className="text-black dark:text-white">User Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</span>
                  <p className="font-semibold text-lg text-black dark:text-white">{user.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email Address</span>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-black dark:text-white">{user.email}</span>
                    {user.isEmailVerified && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Role</span>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sippy Account ID</span>
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-black dark:text-white">
                      {user.sippyAccountId || 'Not linked'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Member Since</span>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-black dark:text-white">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card 
            className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${approvalStatus.bgColor}`}
                  >
                    <StatusIcon className={`h-4 w-4 ${approvalStatus.color}`} />
                  </div>
                  <span className="text-black dark:text-white">Review Status</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`p-4 rounded-lg ${approvalStatus.bgColor} border border-gray-300 dark:border-gray-600`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <StatusIcon className={`h-5 w-5 ${approvalStatus.color}`} />
                  <span className={`font-semibold ${approvalStatus.color}`}>
                    {approvalStatus.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {approved === true && "User&apos;s onboarding has been approved and they can access all features."}
                  {approved === false && "User&apos;s onboarding has been rejected. They may need to provide additional information."}
                  {approved === undefined && "User&apos;s onboarding is pending admin review."}
                </p>
              </div>
              
              {!isEditingReview ? (
                <div className="space-y-3">
                  {adminNotes && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Admin Notes</span>
                      <p className="mt-1 text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-black dark:text-white">{adminNotes}</p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => setIsEditingReview(true)} 
                    variant="outline" 
                    className="w-full border-black dark:border-white text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Review
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 block">Update Status</span>
                    <div className="space-y-2">
                      <Button
                        onClick={() => setApproved(true)}
                        variant={approved === true ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        style={approved === true ? { backgroundColor: 'black', color: 'white' } : {}}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => setApproved(false)}
                        variant={approved === false ? 'destructive' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => setApproved(undefined)}
                        variant={approved === undefined ? 'secondary' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Pending
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Admin Notes</span>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this user&apos;s onboarding..."
                      rows={3}
                      className="mt-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-black dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={handleSaveReview}
                      className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Review
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsEditingReview(false);
                        setApproved(onboarding?.approved);
                        setAdminNotes(onboarding?.adminNotes || '');
                      }} 
                      variant="outline"
                      className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Summary Cards */}
        {onboarding && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Company Info */}
            <Card 
              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                  >
                    <Building2 className="h-5 w-5 text-black dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Company</p>
                    <p className="font-semibold truncate text-black dark:text-white">{onboarding.companyName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {onboarding.address.city}, {onboarding.address.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card 
              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                  >
                    <Phone className="h-5 w-5 text-black dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Contact</p>
                    <p className="font-semibold text-sm text-black dark:text-white">{onboarding.phoneNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {onboarding.preferredContactMethods.length} method(s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card 
              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                  >
                    <Target className="h-5 w-5 text-black dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services</p>
                    <p className="font-semibold truncate text-black dark:text-white">
                      {onboarding.servicesInterested.length} selected
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {onboarding.servicesInterested.slice(0, 2).map(s => getServiceLabel(s.service)).join(', ')}
                      {onboarding.servicesInterested.length > 2 && '...'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Volume */}
            <Card 
              className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800"
                  >
                    <BarChart3 className="h-5 w-5 text-black dark:text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Scale</p>
                    <p className="font-semibold text-sm text-black dark:text-white">
                      {onboarding.trafficVolume.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {onboarding.trafficVolume.type === 'agents' 
                        ? 'agents' 
                        : `${onboarding.trafficVolume.unit}/${onboarding.trafficVolume.period}`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator />

        {/* Detailed Onboarding Information */}
        <AdminOnboardingForm
          userId={userId}
          existingData={onboarding}
          onSave={fetchOnboardingData}
        />
      </div>
    </div>
  );
} 