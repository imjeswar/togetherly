import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ENV } from '../config/env';
import { E2EEKeyPair } from '../types';

// Memory fallback for unsupported platforms or test runners
const memoryCache = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryCache.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch (err) {
    memoryCache.set(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memoryCache.get(key) || (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    return memoryCache.get(key) || null;
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryCache.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    memoryCache.delete(key);
  }
}

export const secureStorage = {
  // Auth Token
  getAuthToken: async () => getItem(ENV.STORAGE_KEYS.AUTH_TOKEN),
  setAuthToken: async (token: string) => setItem(ENV.STORAGE_KEYS.AUTH_TOKEN, token),
  clearAuthToken: async () => deleteItem(ENV.STORAGE_KEYS.AUTH_TOKEN),

  // Biometrics
  getBiometricEnabled: async (): Promise<boolean> => {
    const val = await getItem(ENV.STORAGE_KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  },
  setBiometricEnabled: async (enabled: boolean) => {
    await setItem(ENV.STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  },
  getBiometricPin: async () => getItem(ENV.STORAGE_KEYS.BIOMETRIC_PIN),
  setBiometricPin: async (pin: string) => setItem(ENV.STORAGE_KEYS.BIOMETRIC_PIN, pin),
  clearBiometricPin: async () => deleteItem(ENV.STORAGE_KEYS.BIOMETRIC_PIN),

  // E2EE
  getE2EEKeyPair: async (): Promise<E2EEKeyPair | null> => {
    const pub = await getItem(ENV.STORAGE_KEYS.E2EE_PUBLIC_KEY);
    const priv = await getItem(ENV.STORAGE_KEYS.E2EE_PRIVATE_KEY);
    if (pub && priv) {
      return { publicKey: pub, privateKey: priv };
    }
    return null;
  },
  setE2EEKeyPair: async (pair: E2EEKeyPair) => {
    await setItem(ENV.STORAGE_KEYS.E2EE_PUBLIC_KEY, pair.publicKey);
    await setItem(ENV.STORAGE_KEYS.E2EE_PRIVATE_KEY, pair.privateKey);
  },
  clearE2EEKeyPair: async () => {
    await deleteItem(ENV.STORAGE_KEYS.E2EE_PUBLIC_KEY);
    await deleteItem(ENV.STORAGE_KEYS.E2EE_PRIVATE_KEY);
  },

  // Device Session Tracking
  getDeviceSessionId: async () => getItem(ENV.STORAGE_KEYS.DEVICE_SESSION_ID),
  setDeviceSessionId: async (id: string) => setItem(ENV.STORAGE_KEYS.DEVICE_SESSION_ID, id),

  // Device & Space Storage (Anonymous Credentials)
  getOrCreateDeviceId: async (): Promise<string> => {
    let id = await getItem('togetherly_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      await setItem('togetherly_device_id', id);
    }
    return id;
  },
  getSpaceId: async () => getItem('togetherly_space_id'),
  setSpaceId: async (id: string) => setItem('togetherly_space_id', id),
  clearSpaceId: async () => deleteItem('togetherly_space_id'),

  // Custom Server Endpoint
  getCustomApiUrl: async () => getItem(ENV.STORAGE_KEYS.CUSTOM_API_URL),
  setCustomApiUrl: async (url: string) => setItem(ENV.STORAGE_KEYS.CUSTOM_API_URL, url),
  clearCustomApiUrl: async () => deleteItem(ENV.STORAGE_KEYS.CUSTOM_API_URL),

  // Reset Everything
  clearAll: async () => {
    await deleteItem('togetherly_space_id');
    await deleteItem(ENV.STORAGE_KEYS.AUTH_TOKEN);
    await deleteItem(ENV.STORAGE_KEYS.BIOMETRIC_ENABLED);
    await deleteItem(ENV.STORAGE_KEYS.BIOMETRIC_PIN);
    await deleteItem(ENV.STORAGE_KEYS.E2EE_PUBLIC_KEY);
    await deleteItem(ENV.STORAGE_KEYS.E2EE_PRIVATE_KEY);
    await deleteItem(ENV.STORAGE_KEYS.DEVICE_SESSION_ID);
    memoryCache.clear();
  },
};

