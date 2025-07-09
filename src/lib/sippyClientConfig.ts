import { SippyCredentials } from './sippyClient';
import Settings from '@/models/Settings';
import { connectToDatabase } from './db';

// Keys for Sippy API settings
const SIPPY_USERNAME_KEY = 'sippy_api_username';
const SIPPY_PASSWORD_KEY = 'sippy_api_password';
const SIPPY_HOST_KEY = 'sippy_api_host';

/**
 * Get Sippy API credentials from settings
 */
export async function getSippyApiCredentials(): Promise<SippyCredentials | null> {
  try {
    await connectToDatabase();
    
    const username = await Settings.getSetting(SIPPY_USERNAME_KEY);
    const password = await Settings.getSetting(SIPPY_PASSWORD_KEY);
    const host = await Settings.getSetting(SIPPY_HOST_KEY);
    
    // Ensure all settings are available
    if (!username || !password || !host) {
      console.warn('Sippy API settings are not fully configured');
      return null;
    }
    
    return {
      username,
      password,
      host,
    };
  } catch (error) {
    console.error('Error retrieving Sippy API credentials:', error);
    return null;
  }
}

/**
 * Check if Sippy API settings are configured
 */
export async function isSippyApiConfigured(): Promise<boolean> {
  const credentials = await getSippyApiCredentials();
  return credentials !== null;
} 