import { Platform } from 'react-native';

const isDev = __DEV__;
// Active public tunnel endpoint (reachable via Wi-Fi and Cellular mobile data)
const TUNNEL_URL = 'https://dry-eagles-take.loca.lt';
// Local network IP address for direct Wi-Fi communication
const LAN_IP_URL = 'http://192.168.1.5:5000';
const DEV_LOCALHOST = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const defaultBaseUrl = process.env.EXPO_PUBLIC_API_URL || `${TUNNEL_URL}/api`;
const defaultSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || TUNNEL_URL;

export const ENV = {
  API_BASE_URL: defaultBaseUrl,
  FALLBACK_API_BASE_URL: `${LAN_IP_URL}/api`,
  SOCKET_URL: defaultSocketUrl,
  FALLBACK_SOCKET_URL: LAN_IP_URL,
  APP_SCHEME: 'togetherly://',
  APP_NAME: 'Togetherly',
  TAGLINE: 'A little moment. A stronger connection.',
  STORAGE_KEYS: {
    AUTH_TOKEN: 'togetherly_auth_token',
    USER_PROFILE: 'togetherly_user_profile',
    BIOMETRIC_ENABLED: 'togetherly_biometric_enabled',
    BIOMETRIC_PIN: 'togetherly_biometric_pin',
    E2EE_PRIVATE_KEY: 'togetherly_e2ee_private_key',
    E2EE_PUBLIC_KEY: 'togetherly_e2ee_public_key',
    DEVICE_SESSION_ID: 'togetherly_device_session_id',
    OFFLINE_QUEUE: 'togetherly_offline_queue',
    CUSTOM_API_URL: 'togetherly_custom_api_url',
  },
  SYNC: {
    MAX_RETRIES: 5,
    RETRY_DELAY_MS: 3000,
  },
};
