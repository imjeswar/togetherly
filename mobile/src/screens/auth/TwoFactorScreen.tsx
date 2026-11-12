import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../config/theme';

export const TwoFactorScreen: React.FC = () => {
  const { verify2FA, logout } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter your authentication code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const success = await verify2FA(code.trim());
      if (!success) {
        setError('Invalid authentication code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={logout} style={styles.cancelBtn}>
            <ArrowLeft size={20} color={theme.colors.textSecondary} />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={36} color={theme.colors.secondary} />
          </View>

          <Text style={styles.title}>Two-Factor Security</Text>
          <Text style={styles.subtitle}>
            {useBackupCode
              ? 'Enter one of your 8-character emergency backup codes.'
              : 'Enter the 6-digit verification code from your authenticator app.'}
          </Text>

          {Boolean(error) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            placeholder={useBackupCode ? 'e.g. A1B2C3D4' : '000000'}
            value={code}
            onChangeText={setCode}
            keyboardType={useBackupCode ? 'default' : 'number-pad'}
            maxLength={useBackupCode ? 10 : 6}
            style={styles.codeInput}
            autoFocus
          />

          <Button
            title="Verify & Enter Sanctuary"
            onPress={handleVerify}
            loading={loading}
            size="lg"
            variant="primary"
            style={styles.verifyBtn}
          />

          <TouchableOpacity
            onPress={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
              setError('');
            }}
            style={styles.toggleBtn}
          >
            <Text style={styles.toggleText}>
              {useBackupCode ? 'Use 6-digit Authenticator code' : 'Lost your phone? Use a backup code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['2xl'],
    marginTop: -40,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.secondaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 183, 126, 0.4)',
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radii.lg,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: '700',
  },
  verifyBtn: {
    marginTop: 10,
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
  },
});

