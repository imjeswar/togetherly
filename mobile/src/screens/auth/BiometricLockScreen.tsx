import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Lock, Fingerprint, KeyRound } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FlameIcon } from '../../components/ui/FlameIcon';
import { theme } from '../../config/theme';

export const BiometricLockScreen: React.FC = () => {
  const { unlockBiometric, logout } = useAuth();
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Attempt biometric prompt right on display
    triggerBiometric();
  }, []);

  const triggerBiometric = async () => {
    setError('');
    const success = await unlockBiometric();
    if (!success) {
      // Prompt user to try again or use PIN
      setError('Biometric authentication failed. Tap to retry or use PIN.');
    }
  };

  const handlePinSubmit = async () => {
    if (!pin) {
      setError('Please enter your sanctuary PIN');
      return;
    }
    setError('');
    const success = await unlockBiometric(pin);
    if (!success) {
      setError('Incorrect PIN. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <FlameIcon size={44} isLit />
          <Text style={styles.appName}>Togetherly</Text>
        </View>

        <View style={styles.lockBox}>
          <View style={styles.iconCircle}>
            <Lock size={32} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Sanctuary Protected</Text>
          <Text style={styles.subtitle}>
            Your private relationship space is secured. Authenticate to enter.
          </Text>

          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {usePin ? (
            <View style={styles.pinSection}>
              <Input
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChangeText={setPin}
                isPassword
                keyboardType="number-pad"
                maxLength={6}
                style={styles.pinInput}
                autoFocus
              />
              <Button
                title="Unlock with PIN"
                onPress={handlePinSubmit}
                variant="primary"
                size="lg"
              />
              <TouchableOpacity
                onPress={() => setUsePin(false)}
                style={styles.switchBtn}
              >
                <Fingerprint size={16} color={theme.colors.secondary} />
                <Text style={styles.switchText}>Use Biometrics instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bioSection}>
              <Button
                title="Unlock Sanctuary"
                onPress={triggerBiometric}
                icon={<Fingerprint size={20} color="#0D0B10" />}
                variant="primary"
                size="lg"
              />
              <TouchableOpacity
                onPress={() => setUsePin(true)}
                style={styles.switchBtn}
              >
                <KeyRound size={16} color={theme.colors.secondary} />
                <Text style={styles.switchText}>Unlock with PIN instead</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign in to a different account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  appName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  lockBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii['2xl'],
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.25)',
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: theme.colors.errorMuted,
    padding: 10,
    borderRadius: theme.radii.md,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
  },
  bioSection: {
    width: '100%',
    gap: 14,
  },
  pinSection: {
    width: '100%',
  },
  pinInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 6,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  switchText: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
  },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
});

