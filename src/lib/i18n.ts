// Simple client-side i18n system
import { useState, useEffect } from 'react';

export type Locale = 'en' | 'fr';

export const LOCALES = ['en', 'fr'] as const;

export const LOCALE_NAMES = {
  en: 'English',
  fr: 'Français'
} as const;

export const LOCALE_FLAGS = {
  en: '🇺🇸',
  fr: '🇫🇷'
} as const;

// Fallback translations to prevent hydration mismatches
const fallbackNavigationTranslations = {
  en: {
    sections: {
      main: "Main",
      callManagement: "Call Management", 
      services: "Services",
      billing: "Billing",
      support: "Support",
      account: "Account"
    },
    items: {
      dashboard: { label: "Dashboard", description: "Overview and statistics" },
      activeCalls: { label: "Active Calls", description: "Monitor ongoing calls" },
      cdrReports: { label: "Call Reports", description: "Call detail records" },
      phoneNumbers: { label: "Phone Numbers", description: "Manage phone numbers" },
      numberRequests: { label: "Number Requests", description: "Phone number requests" },
      numbers: { label: "Numbers", description: "Your phone numbers" },
      trunks: { label: "Trunks", description: "Manage SIP trunks" },
      userTrunks: { label: "My Trunks", description: "Your SIP trunks" },
      rates: { label: "Rates", description: "Call and SMS rates" },
      payments: { label: "Payments", description: "Billing and payments" },
      supportTickets: { label: "Support", description: "Help and support tickets" },
      myAccount: { label: "My Account", description: "Account settings" },
      users: { label: "Users", description: "Manage users" },
      customerNotifications: { label: "Customer Notifications", description: "Manage notifications" },
      notificationLogs: { label: "Notification Logs", description: "View notification history" },
      settings: { label: "Settings", description: "System settings" },
      sms: { label: "SMS", description: "Send and manage SMS messages" }
    },
    client: {
      dashboard: "Dashboard",
      accounts: "Accounts", 
      activeCalls: "Active Calls",
      cdrReports: "CDR Reports",
      settings: "Settings",
      signOut: "Sign Out"
    },
    header: {
      dashboard: "Dashboard"
    }
  },
  fr: {
    sections: {
      main: "Principal",
      callManagement: "Gestion des Appels", 
      services: "Services",
      billing: "Facturation",
      support: "Support",
      account: "Compte"
    },
    items: {
      dashboard: { label: "Tableau de Bord", description: "Vue d'ensemble et statistiques" },
      activeCalls: { label: "Appels Actifs", description: "Surveiller les appels en cours" },
      cdrReports: { label: "Rapports d'Appels", description: "Enregistrements détaillés des appels" },
      phoneNumbers: { label: "Numéros de Téléphone", description: "Gérer les numéros de téléphone" },
      numberRequests: { label: "Demandes de Numéros", description: "Gérer les demandes d'annulation" },
      numbers: { label: "Numéros", description: "Gérer vos numéros de téléphone" },
      trunks: { label: "Trunks", description: "Gestion des Trunks SIP" },
      userTrunks: { label: "Mes Trunks", description: "Voir vos Trunks SIP" },
      rates: { label: "Tarifs", description: "Tarifs et prix du compte" },
      payments: { label: "Paiements", description: "Historique des paiements et solde" },
      supportTickets: { label: "Tickets de Support", description: "Tickets de support et centre d'aide" },
      myAccount: { label: "Mon Compte", description: "Profil et facturation" },
      users: { label: "Utilisateurs", description: "Gestion des utilisateurs" },
      customerNotifications: { label: "Notifications Client", description: "Gérer les campagnes de notification client" },
      notificationLogs: { label: "Journaux de Notifications", description: "Historique des notifications par e-mail" },
      settings: { label: "Paramètres", description: "Configuration du système" },
      sms: { label: "SMS", description: "Envoyer et gérer les messages SMS" }
    },
    client: {
      dashboard: "Tableau de Bord",
      accounts: "Comptes", 
      activeCalls: "Appels Actifs",
      cdrReports: "Rapports CDR",
      settings: "Paramètres",
      signOut: "Se déconnecter"
    },
    header: {
      dashboard: "Tableau de Bord"
    }
  }
};

// Translation messages
let messages: Record<Locale, any> = {
  en: {
    navigation: fallbackNavigationTranslations.en
  },
  fr: {
    navigation: fallbackNavigationTranslations.fr
  }
};

// Load messages asynchronously from split files
const loadMessages = async () => {
  try {
    // Load critical modules first (navigation, common, phoneNumbers, sms)
    const [
      // Critical English modules - loaded first
      enCommon,
      enNavigation,
      enPhoneNumbers,
      enSms,
      // Critical French modules - loaded first
      frCommon,
      frNavigation,
      frPhoneNumbers,
      frSms
    ] = await Promise.all([
      import('../i18n/messages/en/common.json'),
      import('../i18n/messages/en/navigation.json'),
      import('../i18n/messages/en/phoneNumbers.json'),
      import('../i18n/messages/en/sms.json'),
      import('../i18n/messages/fr/common.json'),
      import('../i18n/messages/fr/navigation.json'),
      import('../i18n/messages/fr/phoneNumbers.json'),
      import('../i18n/messages/fr/sms.json')
    ]);

    // Set critical translations immediately
    messages.en = {
      common: enCommon.default,
      navigation: enNavigation.default,
      phoneNumbers: enPhoneNumbers.default,
      sms: enSms.default,
      // Add empty objects for other modules to prevent errors
      auth: {},
      onboarding: {},
      dashboard: {},
      calls: {},
      cdrs: {},
      adminPhoneRequests: {},
      trunks: {},
      authRules: {},
      adminTrunks: {},
      rates: {},
      account: {},
      admin: {}
    };

    messages.fr = {
      common: frCommon.default,
      navigation: frNavigation.default,
      phoneNumbers: frPhoneNumbers.default,
      sms: frSms.default,
      // Add empty objects for other modules to prevent errors
      auth: {},
      onboarding: {},
      dashboard: {},
      calls: {},
      cdrs: {},
      adminPhoneRequests: {},
      trunks: {},
      authRules: {},
      adminTrunks: {},
      rates: {},
      account: {},
      admin: {}
    };

    // Now load the remaining modules in the background
    const [
      // Remaining English modules
      enAuth,
      enOnboarding,
      enDashboard,
      enCalls,
      enCdrs,
      enAdminPhoneRequests,
      enTrunks,
      enAuthRules,
      enAdminTrunks,
      enRates,
      enAccount,
      enAdmin,
      // Remaining French modules  
      frAuth,
      frOnboarding,
      frDashboard,
      frCalls,
      frCdrs,
      frAdminPhoneRequests,
      frTrunks,
      frAuthRules,
      frAdminTrunks,
      frRates,
      frAccount,
      frAdmin
    ] = await Promise.all([
      // English
      import('../i18n/messages/en/auth.json'),
      import('../i18n/messages/en/onboarding.json'),
      import('../i18n/messages/en/dashboard.json'),
      import('../i18n/messages/en/calls.json'),
      import('../i18n/messages/en/cdrs.json'),
      import('../i18n/messages/en/admin-phone-requests.json'),
      import('../i18n/messages/en/trunks.json'),
      import('../i18n/messages/en/auth-rules.json'),
      import('../i18n/messages/en/admin-trunks.json'),
      import('../i18n/messages/en/rates.json'),
      import('../i18n/messages/en/account.json'),
      import('../i18n/messages/en/admin.json'),
      // French
      import('../i18n/messages/fr/auth.json'),
      import('../i18n/messages/fr/onboarding.json'),
      import('../i18n/messages/fr/dashboard.json'),
      import('../i18n/messages/fr/calls.json'),
      import('../i18n/messages/fr/cdrs.json'),
      import('../i18n/messages/fr/admin-phone-requests.json'),
      import('../i18n/messages/fr/trunks.json'),
      import('../i18n/messages/fr/auth-rules.json'),
      import('../i18n/messages/fr/admin-trunks.json'),
      import('../i18n/messages/fr/rates.json'),
      import('../i18n/messages/fr/account.json'),
      import('../i18n/messages/fr/admin.json')
    ]);
    
    // Merge remaining English translations
    Object.assign(messages.en, {
      auth: enAuth.default,
      onboarding: enOnboarding.default,
      dashboard: enDashboard.default,
      calls: enCalls.default,
      cdrs: enCdrs.default,
      adminPhoneRequests: enAdminPhoneRequests.default,
      trunks: enTrunks.default,
      authRules: enAuthRules.default,
      adminTrunks: enAdminTrunks.default,
      rates: enRates.default,
      account: enAccount.default,
      admin: enAdmin.default
    });
    
    // Merge remaining French translations
    Object.assign(messages.fr, {
      auth: frAuth.default,
      onboarding: frOnboarding.default,
      dashboard: frDashboard.default,
      calls: frCalls.default,
      cdrs: frCdrs.default,
      adminPhoneRequests: frAdminPhoneRequests.default,
      trunks: frTrunks.default,
      authRules: frAuthRules.default,
      adminTrunks: frAdminTrunks.default,
      rates: frRates.default,
      account: frAccount.default,
      admin: frAdmin.default
    });
  } catch (error) {
    console.error('Failed to load translation messages:', error);
  }
};

// Track loading state
let messagesLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Load messages immediately
const initializeMessages = () => {
  if (!loadingPromise) {
    loadingPromise = loadMessages().then(() => {
      messagesLoaded = true;
    });
  }
  return loadingPromise;
};

initializeMessages();

// Get the user's preferred language
export const getUserLanguage = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  
  // Check localStorage first
  const saved = localStorage.getItem('preferredLanguage') as Locale;
  if (saved && LOCALES.includes(saved)) {
    return saved;
  }
  
  // Fallback to browser language
  const browserLang = navigator.language.split('-')[0] as Locale;
  return LOCALES.includes(browserLang) ? browserLang : 'en';
};

// Set the user's preferred language
export const setUserLanguage = (locale: Locale) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferredLanguage', locale);
};

// Simple translation function
export const t = (key: string, locale: Locale = getUserLanguage(), params?: Record<string, string>): string => {
  // Always try loaded messages first
  if (messagesLoaded && messages[locale]) {
  const keys = key.split('.');
  let value: any = messages[locale];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
    if (typeof value === 'string') {
      // Replace parameters
      if (params) {
        return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
          return params[paramKey] || match;
        });
      }
      return value;
    }
  }
  
  // Fallback to fallback translations
  const keys = key.split('.');
  let value: any = fallbackNavigationTranslations[locale];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (typeof value === 'string') {
  // Replace parameters
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
      return params[paramKey] || match;
    });
    }
    return value;
  }
  
  // If not found in current locale, try English
  if (locale !== 'en') {
    return t(key, 'en', params);
  }
  
  // If messages aren't loaded yet, return critical fallbacks
  if (!messagesLoaded) {
    // Navigation critical fallbacks
    if (key === 'navigation.sections.main') return (locale as string) === 'fr' ? 'Principal' : 'Main';
    if (key === 'navigation.sections.callManagement') return (locale as string) === 'fr' ? 'Gestion des Appels' : 'Call Management';
    if (key === 'navigation.sections.services') return 'Services';
    if (key === 'navigation.sections.billing') return (locale as string) === 'fr' ? 'Facturation' : 'Billing';
    if (key === 'navigation.sections.support') return 'Support';
    if (key === 'navigation.sections.account') return (locale as string) === 'fr' ? 'Compte' : 'Account';
    
    // Phone Numbers - Reputation fallbacks
    if (key === 'phoneNumbers.reputation.modal.title') return (locale as string) === 'fr' ? 'Réputation du Numéro de Téléphone' : 'Phone Number Reputation';
    if (key === 'phoneNumbers.reputation.modal.scrollIndicator') return (locale as string) === 'fr' ? 'Faites défiler pour voir tous les détails de réputation' : 'Scroll to view all reputation details';
    if (key === 'phoneNumbers.reputation.modal.buttons.analyze') return (locale as string) === 'fr' ? 'Analyser' : 'Analyze';
    if (key === 'phoneNumbers.reputation.modal.buttons.checking') return (locale as string) === 'fr' ? 'Vérification...' : 'Checking...';
    if (key === 'phoneNumbers.reputation.modal.buttons.viewSource') return (locale as string) === 'fr' ? 'Voir la Source' : 'View Source';
    if (key === 'phoneNumbers.reputation.modal.buttons.refresh') return (locale as string) === 'fr' ? 'Actualiser' : 'Refresh';
    if (key === 'phoneNumbers.reputation.modal.buttons.close') return (locale as string) === 'fr' ? 'Fermer' : 'Close';
    if (key === 'phoneNumbers.reputation.statusDescriptions.safe') return (locale as string) === 'fr' ? 'Numéro Sûr' : 'Safe Number';
    if (key === 'phoneNumbers.reputation.statusDescriptions.neutral') return (locale as string) === 'fr' ? 'Numéro Neutre' : 'Neutral Number';
    if (key === 'phoneNumbers.reputation.statusDescriptions.annoying') return (locale as string) === 'fr' ? 'Numéro Gênant' : 'Annoying Number';
    if (key === 'phoneNumbers.reputation.statusDescriptions.dangerous') return (locale as string) === 'fr' ? 'Numéro Dangereux' : 'Dangerous Number';
    if (key === 'phoneNumbers.reputation.statusDescriptions.unknown') return (locale as string) === 'fr' ? 'Statut Inconnu' : 'Unknown Status';
    if (key === 'phoneNumbers.reputation.statusDescriptions.reputationStatus') return (locale as string) === 'fr' ? 'Statut de Réputation' : 'Reputation Status';
    if (key === 'phoneNumbers.reputation.displayText.safe') return (locale as string) === 'fr' ? `Sûr (${params?.dangerLevel || '0'}%)` : `Safe (${params?.dangerLevel || '0'}%)`;
    if (key === 'phoneNumbers.reputation.displayText.neutral') return (locale as string) === 'fr' ? `Neutre (${params?.dangerLevel || '0'}%)` : `Neutral (${params?.dangerLevel || '0'}%)`;
    if (key === 'phoneNumbers.reputation.displayText.annoying') return (locale as string) === 'fr' ? `Gênant (${params?.dangerLevel || '0'}%)` : `Annoying (${params?.dangerLevel || '0'}%)`;
    if (key === 'phoneNumbers.reputation.displayText.dangerous') return (locale as string) === 'fr' ? `Dangereux (${params?.dangerLevel || '0'}%)` : `Dangerous (${params?.dangerLevel || '0'}%)`;
    if (key === 'phoneNumbers.reputation.displayText.unknown') return (locale as string) === 'fr' ? 'Inconnu' : 'Unknown';
    if (key === 'phoneNumbers.reputation.stats.comments') return (locale as string) === 'fr' ? 'Commentaires' : 'Comments';
    if (key === 'phoneNumbers.reputation.stats.visits') return (locale as string) === 'fr' ? 'Visites' : 'Visits';
    if (key === 'phoneNumbers.reputation.stats.trustScore') return (locale as string) === 'fr' ? 'Score de Confiance' : 'Trust Score';
    if (key === 'phoneNumbers.reputation.stats.lastVisit') return (locale as string) === 'fr' ? 'Dernière Visite' : 'Last Visit';
    if (key === 'phoneNumbers.reputation.stats.unknown') return (locale as string) === 'fr' ? 'Inconnu' : 'Unknown';
    if (key === 'phoneNumbers.reputation.cards.checking') return (locale as string) === 'fr' ? 'Vérification...' : 'Checking...';
    if (key === 'phoneNumbers.reputation.tooltips.analyze') return (locale as string) === 'fr' ? 'Analyser la réputation du numéro de téléphone' : 'Analyze phone number reputation';
    if (key === 'phoneNumbers.messages.error.analyzeReputation') return (locale as string) === 'fr' ? 'Échec de l\'analyse de réputation' : 'Failed to analyze reputation';
    
    // Phone Numbers - General fallbacks
    if (key === 'phoneNumbers.page.title') return (locale as string) === 'fr' ? 'Numéros de Téléphone' : 'Phone Numbers';
    if (key === 'phoneNumbers.page.description') return (locale as string) === 'fr' ? 'Gérez vos numéros de téléphone assignés' : 'Manage your assigned phone numbers';
    if (key === 'phoneNumbers.page.breadcrumbs.dashboard') return (locale as string) === 'fr' ? 'Tableau de Bord' : 'Dashboard';
    if (key === 'phoneNumbers.page.breadcrumbs.services') return 'Services';
    if (key === 'phoneNumbers.page.breadcrumbs.numbers') return (locale as string) === 'fr' ? 'Numéros' : 'Numbers';
    if (key === 'phoneNumbers.header.buttons.buyNumbers') return (locale as string) === 'fr' ? 'Acheter des Numéros' : 'Buy Numbers';
    if (key === 'phoneNumbers.tabs.myNumbers') return (locale as string) === 'fr' ? 'Mes Numéros' : 'My Numbers';
    if (key === 'phoneNumbers.tabs.requests') return (locale as string) === 'fr' ? 'Demandes' : 'Requests';
    if (key === 'phoneNumbers.filters.title') return (locale as string) === 'fr' ? 'Filtres' : 'Filters';
    if (key === 'phoneNumbers.filters.searchPlaceholder') return (locale as string) === 'fr' ? 'Rechercher des numéros...' : 'Search numbers...';
    
    // Other critical fallbacks
    if (key === 'rates.page.title') return 'Rates Management';
    if (key === 'rates.page.description') return 'View and manage your account rates';
    if (key === 'rates.page.breadcrumbs.dashboard') return 'Dashboard';
    if (key === 'rates.page.breadcrumbs.rates') return 'Rates';
    if (key === 'rates.tabs.calls') return 'Call Rates';
    if (key === 'rates.tabs.numbers') return 'Number Rates';
    if (key === 'rates.tabs.sms') return 'SMS Rates';
    if (key === 'rates.common.states.loading') return 'Loading...';
    if (key === 'rates.common.actions.refresh') return 'Refresh';
    if (key === 'rates.numberRates.title') return 'Number Rate Decks';
    if (key === 'rates.smsRates.title') return 'SMS Rate Decks';
    if (key === 'rates.numberRates.stats.totalDecks') return 'Total Decks';
    if (key === 'rates.numberRates.stats.activeDecks') return 'Active Decks';
    if (key === 'rates.numberRates.stats.totalRates') return 'Total Rates';
    if (key === 'rates.numberRates.stats.assignedUsers') return 'Assigned Users';
    if (key === 'rates.smsRates.stats.totalDecks') return 'Total Decks';
    if (key === 'rates.smsRates.stats.activeDecks') return 'Active Decks';
    if (key === 'rates.smsRates.stats.totalRates') return 'Total Rates';
    if (key === 'rates.smsRates.stats.assignedUsers') return 'Assigned Users';
    if (key === 'rates.common.filters.active') return 'Active';
    if (key === 'rates.common.filters.inactive') return 'Inactive';
    if (key === 'rates.common.filters.yes') return 'Yes';
    if (key === 'rates.common.filters.no') return 'No';
    if (key === 'rates.numberRates.userRates.title') return 'My Number Rates';
    if (key === 'rates.smsRates.userRates.title') return 'My SMS Rates';
    if (key === 'rates.numberRates.userRates.noAssignment') return 'No Number Rates Assigned';
    if (key === 'rates.smsRates.userRates.noAssignment') return 'No SMS Rates Assigned';
    if (key === 'rates.numberRates.userRates.description') return 'Contact your administrator to get rate decks assigned';
    if (key === 'rates.smsRates.userRates.description') return 'Contact your administrator to get rate decks assigned';
    if (key === 'rates.common.actions.apply') return 'Apply Filters';
    if (key === 'rates.common.actions.clearAll') return 'Clear All';
    if (key === 'rates.common.states.errorDescription') return 'There was an error loading the data';
    if (key === 'navigation.header.dashboard') return 'Dashboard';
    if (key === 'account.page.title') return 'My Account';
    if (key === 'account.page.description') return 'View and manage your account details and profile information';
    if (key === 'account.profile.title') return 'Profile Details';
    if (key === 'account.profile.refresh') return 'Refresh';
    if (key === 'account.tabs.account') return 'Account';
    if (key === 'account.tabs.company') return 'Company';
    if (key === 'account.tabs.contact') return 'Contact';
    if (key === 'account.tabs.services') return 'Services';
    if (key === 'account.tabs.security') return 'Security';
  }
  
  return key; // Return key as final fallback
};

// React hook for translations
export const useTranslations = () => {
  const [locale, setLocale] = useState<Locale>(() => {
    // During SSR, always start with 'en' to prevent hydration mismatch
    if (typeof window === 'undefined') return 'en';
    return 'en'; // Start with 'en' on client too, will update after hydration
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // This only runs on the client
    const initialize = async () => {
      await initializeMessages();
      setIsHydrated(true);
      // Only now get the user's preferred language
      const userLocale = getUserLanguage();
      setLocale(userLocale);
    setIsLoading(false);
    };
    
    initialize();
  }, []);

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setUserLanguage(newLocale);
  };

  const translate = (key: string, params?: Record<string, string>): string => {
    // Always use the current locale state (which starts as 'en' and updates after hydration)
    return t(key, locale, params);
  };

  return {
    locale,
    setLocale: changeLocale,
    t: translate,
    isLoading: isLoading || !isHydrated
  };
}; 