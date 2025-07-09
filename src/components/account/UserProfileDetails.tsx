'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  RefreshCw, 
  User, 
  Mail, 
  Shield, 
  Building2, 
  Phone, 
  MessageCircle, 
  Target, 
  BarChart3, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { UserData } from '@/lib/authService';
import { UserOnboarding } from '@/models/UserOnboarding';
import { useTranslations } from '@/lib/i18n';

interface UserProfileDetailsProps {
  user: UserData;
}

export function UserProfileDetails({ user }: UserProfileDetailsProps) {
  const [onboardingData, setOnboardingData] = useState<UserOnboarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch onboarding data
  useEffect(() => {
    const fetchOnboardingData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();
          setOnboardingData(data.onboarding);
        } else if (response.status === 404) {
          // No onboarding data found - this is okay
          setOnboardingData(null);
        } else {
          throw new Error('Failed to fetch onboarding data');
        }
      } catch (err) {
        console.error('Error fetching onboarding data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnboardingData();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'client':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVerificationStatus = () => {
    if (user.isEmailVerified) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        text: t('account.account.verified'),
        color: 'text-green-600'
      };
    } else {
      return {
        icon: <XCircle className="h-4 w-4 text-red-600" />,
        text: t('account.account.notVerified'),
        color: 'text-red-600'
      };
    }
  };

  const getServiceDisplayName = (serviceName: string) => {
    const serviceKey = `account.services.serviceNames.${serviceName}`;
    const translated = t(serviceKey);
    
    // If translation key is returned as-is, fall back to formatted service name
    if (translated === serviceKey) {
      return serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return translated;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error(t('account.security.validation.allFieldsRequired'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('account.security.validation.passwordsDoNotMatch'));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error(t('account.security.validation.passwordTooShort'));
      return;
    }

    if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      toast.error(t('account.security.validation.passwordComplexity'));
      return;
    }

    try {
      setIsChangingPassword(true);
      
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      toast.success(t('account.security.success'));
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      
    } catch (err) {
      console.error('Error changing password:', err);
      toast.error(err instanceof Error ? err.message : t('account.security.error'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('account.profile.title')}
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('account.profile.refresh')}
        </Button>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="account">{t('account.tabs.account')}</TabsTrigger>
          <TabsTrigger value="company">{t('account.tabs.company')}</TabsTrigger>
          <TabsTrigger value="contact">{t('account.tabs.contact')}</TabsTrigger>
          <TabsTrigger value="services">{t('account.tabs.services')}</TabsTrigger>
          <TabsTrigger value="security">{t('account.tabs.security')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('account.account.title')}
              </CardTitle>
              <CardDescription>{t('account.account.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('account.account.fullName')}</h3>
                  <p className="text-lg font-medium">{user.name}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('account.account.emailAddress')}</h3>
                  <div className="flex items-center gap-2">
                    <p>{user.email}</p>
                    <div className={`flex items-center gap-1 ${getVerificationStatus().color}`}>
                      {getVerificationStatus().icon}
                      <span className="text-xs font-medium">{getVerificationStatus().text}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('account.account.role')}</h3>
                  <Badge variant="outline" className={getRoleColor(user.role)}>
                    <Shield className="h-3 w-3 mr-1" />
                    {t(`account.roles.${user.role}`)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('account.account.accountId')}</h3>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('account.company.title')}
              </CardTitle>
              <CardDescription>{t('account.company.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {onboardingData ? (
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">{t('account.company.companyName')}</h3>
                      <p className="text-lg font-medium">{onboardingData.companyName}</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">{t('account.company.businessPhone')}</h3>
                      <p>{onboardingData.phoneNumber}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{t('account.company.businessAddress')}</h3>
                    <div className="text-sm space-y-1">
                      <p>{onboardingData.address.street}</p>
                      <p>
                        {onboardingData.address.city}, {onboardingData.address.state} {onboardingData.address.postalCode}
                      </p>
                      <p>{onboardingData.address.country}</p>
                    </div>
                  </div>
                  
                  {onboardingData.trafficVolume && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('account.company.expectedTrafficVolume')}</h3>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          <p>
                            {onboardingData.trafficVolume.value.toLocaleString()} {onboardingData.trafficVolume.unit} {t('account.company.per')} {onboardingData.trafficVolume.period}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {onboardingData.additionalNotes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">{t('account.company.additionalNotes')}</h3>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                          {onboardingData.additionalNotes}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('account.company.noCompanyInfo')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('account.company.noCompanyInfoDescription')}
                  </p>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    {t('account.company.completeOnboarding')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t('account.contact.title')}
              </CardTitle>
              <CardDescription>{t('account.contact.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {onboardingData?.preferredContactMethods?.length ? (
                <div className="space-y-4">
                  {onboardingData.preferredContactMethods.map((method, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {method.type === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                        {method.type === 'phone' && <Phone className="h-4 w-4 text-green-600" />}
                        {method.type === 'whatsapp' && <MessageCircle className="h-4 w-4 text-green-600" />}
                        {method.type === 'other' && <MessageCircle className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {t(`account.contact.${method.type}`)}
                          </Badge>
                          <span className="font-medium">{method.value}</span>
                        </div>
                        {method.description && (
                          <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('account.contact.noContactPreferences')}</h3>
                  <p className="text-muted-foreground">
                    {t('account.contact.noContactPreferencesDescription')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t('account.services.title')}
              </CardTitle>
              <CardDescription>{t('account.services.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {onboardingData?.servicesInterested?.length ? (
                <div className="space-y-4">
                  {onboardingData.servicesInterested.map((service, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-medium">
                          {getServiceDisplayName(service.service)}
                        </Badge>
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      )}
                      {service.countries && service.countries.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground mr-2">{t('account.services.countries')}:</span>
                          {service.countries.map((country, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {country}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('account.services.noServicesSelected')}</h3>
                  <p className="text-muted-foreground">
                    {t('account.services.noServicesSelectedDescription')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('account.security.title')}
              </CardTitle>
              <CardDescription>{t('account.security.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">{t('account.security.changePassword')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('account.security.passwordRequirements')}
                  </p>
                  
                  <Separator />
                  
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('account.security.currentPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder={t('account.security.currentPasswordPlaceholder')}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('account.security.newPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder={t('account.security.newPasswordPlaceholder')}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('account.security.confirmPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder={t('account.security.confirmPasswordPlaceholder')}
                        className="pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="min-w-[120px]"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('account.security.updating')}
                      </>
                    ) : (
                      t('account.security.updatePassword')
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 