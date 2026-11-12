import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  ShieldCheck,
  Fingerprint,
  Smartphone,
  Key,
  Trash2,
  Lock,
  Copy,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { secureStorage } from '../../services/secureStore';
import { biometricService } from '../../services/biometric';
import { e2eeService } from '../../services/e2ee';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const SecurityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [keyPair, setKeyPair] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [partnerKey, setPartnerKey] = useState<any | null>(null);

  // 2FA modal state
  const [twoFaModal, setTwoFaModal] = useState(false);
  const [twoFaSecret, setTwoFaSecret] = useState<string>('');
  const [twoFaOtpAuth, setTwoFaOtpAuth] = useState<string>('');
  const [twoFaVerificationCode, setTwoFaVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading2FA, setLoading2FA] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    const isBio = await secureStorage.getBiometricEnabled();
    setBiometricEnabled(isBio);

    const keys = await e2eeService.getOrCreateKeyPair();
    setKeyPair(keys);

    try {
      const pKey = await api.getPartnerPublicKey();
      setPartnerKey(pKey);
    } catch {}

    try {
      const sess = await api.getSessions();
      if (Array.isArray(sess)) setSessions(sess);
    } catch {}
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      const check = await biometricService.checkAvailability();
      if (!check.hasHardware || !check.isEnrolled) {
        Alert.alert(
          'Biometrics Unavailable',
          'Your device does not have biometric authentication enrolled. Set a passcode in device settings.'
        );
        return;
      }
      const success = await biometricService.authenticate('Authenticate to enable biometric sanctuary lock');
      if (success) {
        await secureStorage.setBiometricEnabled(true);
        setBiometricEnabled(true);
        Alert.alert('Protected', 'Biometric lock is now active.');
      }
    } else {
      await secureStorage.setBiometricEnabled(false);
      setBiometricEnabled(false);
    }
  };

  const handleStart2FASetup = async () => {
    setLoading2FA(true);
    try {
      const res = await api.setup2FA();
      if (res.secret) {
        setTwoFaSecret(res.secret);
        setTwoFaOtpAuth(res.otpauthUrl || '');
        setTwoFaModal(true);
      }
    } catch (err: any) {
      Alert.alert('2FA Setup Error', err.message || 'Failed to initialize 2FA setup.');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleVerifyAndEnable2FA = async () => {
    if (!twoFaVerificationCode.trim()) {
      Alert.alert('Enter Code', 'Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading2FA(true);
    try {
      const res = await api.enable2FA(twoFaVerificationCode.trim());
      if (res.success) {
        setBackupCodes(res.backupCodes || []);
        await refreshUser();
        Alert.alert('2FA Enabled!', 'Two-Factor Authentication is now securing your account.');
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Incorrect verification code.');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      Alert.alert('Session Terminated', 'The selected device has been signed out.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to revoke session.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Security & Privacy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Biometrics */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Fingerprint size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Biometric Application Lock</Text>
              <Text style={styles.itemSub}>Require Face ID / Fingerprint to open app</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#2A2332', true: theme.colors.primary }}
              thumbColor="#FFF8F5"
            />
          </View>
        </Card>

        {/* Two-Factor Authentication */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <ShieldCheck size={22} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Two-Factor Authentication (2FA)</Text>
              <Text style={styles.itemSub}>
                {user?.twoFactorEnabled ? 'Active (Authenticator App)' : 'Protect login with RFC 6238 TOTP'}
              </Text>
            </View>
            <Badge
              label={user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              variant={user?.twoFactorEnabled ? 'success' : 'neutral'}
            />
          </View>

          {!user?.twoFactorEnabled ? (
            <Button
              title="Set Up 2FA Authenticator"
              onPress={handleStart2FASetup}
              loading={loading2FA}
              variant="secondary"
              size="sm"
              style={{ marginTop: 14 }}
            />
          ) : (
            <Text style={styles.active2faNote}>
              2FA is active. Backup codes are available for emergency access.
            </Text>
          )}
        </Card>

        {/* Genuine E2EE Key Registry */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Key size={20} color={theme.colors.secondary} />
            <Text style={styles.sectionTitle}>Genuine End-to-End Encryption</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Private keys never leave this device. Messages and love notes are decrypted exclusively on partner hardware.
          </Text>

          <View style={styles.keyBox}>
            <Text style={styles.keyLabel}>Your Device Public Key ID:</Text>
            <Text style={styles.keyValue}>
              {keyPair?.publicKey ? `${keyPair.publicKey.substring(0, 32)}...` : 'Generating...'}
            </Text>
          </View>

          <View style={styles.keyBox}>
            <Text style={styles.keyLabel}>Partner Public Key ID:</Text>
            <Text style={styles.keyValue}>
              {partnerKey?.publicKey
                ? `${partnerKey.publicKey.substring(0, 32)}...`
                : 'Awaiting partner device sync'}
            </Text>
          </View>
        </Card>

        {/* Active Device Sessions */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Smartphone size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Authorized Device Sessions</Text>
          </View>

          {sessions.length === 0 ? (
            <Text style={styles.itemSub}>No other active sessions registered.</Text>
          ) : (
            sessions.map((sess) => (
              <View key={sess.id} style={styles.sessionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionName}>
                    {sess.deviceName || 'Mobile Device'} {sess.isCurrent ? '(This Device)' : ''}
                  </Text>
                  <Text style={styles.sessionSub}>
                    Platform: {sess.platform || 'native'} • Last active:{' '}
                    {new Date(sess.lastActive || sess.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {!sess.isCurrent && (
                  <TouchableOpacity
                    onPress={() => handleRevokeSession(sess.id)}
                    style={styles.revokeBtn}
                  >
                    <Trash2 size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* 2FA Setup Modal */}
      <Modal visible={twoFaModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalTitle}>Set Up 2FA</Text>
              <TouchableOpacity onPress={() => setTwoFaModal(false)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Enter this manual secret key into Google Authenticator, 1Password, or Authy:
            </Text>

            <View style={styles.secretBox}>
              <Text style={styles.secretText}>{twoFaSecret}</Text>
            </View>

            <Input
              label="6-Digit Verification Code"
              placeholder="000000"
              value={twoFaVerificationCode}
              onChangeText={setTwoFaVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
              style={{ textAlign: 'center', fontSize: 20, letterSpacing: 4 }}
            />

            <Button
              title="Verify & Activate 2FA"
              onPress={handleVerifyAndEnable2FA}
              loading={loading2FA}
              variant="primary"
              size="md"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  barTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    padding: 20,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  itemSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  active2faNote: {
    fontSize: 12,
    color: theme.colors.success,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  keyBox: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radii.md,
    padding: 10,
    marginBottom: 8,
  },
  keyLabel: {
    fontSize: 10,
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  keyValue: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  sessionName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sessionSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  revokeBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii['2xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  modalDesc: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  secretBox: {
    backgroundColor: '#130E17',
    padding: 14,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  secretText: {
    color: theme.colors.secondary,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 2,
  },
});
