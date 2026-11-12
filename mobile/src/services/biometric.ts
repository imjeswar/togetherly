import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from './secureStore';

export interface BiometricCheckResult {
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: 'FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | 'NONE';
}

export const biometricService = {
  checkAvailability: async (): Promise<BiometricCheckResult> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: 'FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | 'NONE' = 'NONE';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'FACIAL_RECOGNITION';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'FINGERPRINT';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'IRIS';
      }

      return {
        hasHardware,
        isEnrolled,
        biometricType,
      };
    } catch {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: 'NONE',
      };
    }
  },

  authenticate: async (promptMessage = 'Unlock your Togetherly sanctuary'): Promise<boolean> => {
    try {
      const isEnabled = await secureStorage.getBiometricEnabled();
      if (!isEnabled) {
        return true; // Not enabled, allow bypass to app
      }

      const { hasHardware, isEnrolled } = await biometricService.checkAvailability();
      if (!hasHardware || !isEnrolled) {
        // Fall back to PIN verification if user set one
        const pin = await secureStorage.getBiometricPin();
        return !pin; // if no PIN, let through; if PIN set, lock screen must prompt for PIN
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Sanctuary PIN',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch {
      return false;
    }
  },

  verifyPin: async (inputPin: string): Promise<boolean> => {
    const savedPin = await secureStorage.getBiometricPin();
    if (!savedPin) return true;
    return savedPin === inputPin;
  },
};

