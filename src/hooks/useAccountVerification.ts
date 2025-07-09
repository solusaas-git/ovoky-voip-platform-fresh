import { useAuth } from '@/lib/AuthContext';

export function useAccountVerification() {
  const { user } = useAuth();

  const needsVerification = user && user.isEmailVerified && !user.sippyAccountId;
  const isEmailVerified = user?.isEmailVerified || false;
  const hasSippyAccount = !!user?.sippyAccountId;

  return {
    needsVerification,
    isEmailVerified,
    hasSippyAccount,
    user
  };
} 