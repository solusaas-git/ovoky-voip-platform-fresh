// SMS Models - Import in correct order to ensure all dependencies are registered
import SmsContactList from './SmsContactList';
import SmsContact from './SmsContact';
import SmsTemplate from './SmsTemplate';
import SmsProvider from './SmsGateway';
import SmsUserProviderAssignment from './SmsUserProviderAssignment';
import SmsCampaign from './SmsCampaign';
import SmsBilling from './SmsBilling';
import SmsBillingSettings from './SmsBillingSettings';

// Export all models
export {
  SmsContactList,
  SmsContact,
  SmsTemplate,
  SmsProvider,
  SmsUserProviderAssignment,
  SmsCampaign,
  SmsBilling,
  SmsBillingSettings
};

// Ensure models are registered
export const initializeSmsModels = () => {
  // This function ensures all models are loaded and registered with Mongoose
  return {
    SmsContactList,
    SmsContact,
    SmsTemplate,
    SmsProvider,
    SmsUserProviderAssignment,
    SmsCampaign,
    SmsBilling,
    SmsBillingSettings
  };
}; 