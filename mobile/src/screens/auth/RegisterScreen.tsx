import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FlameIcon } from '../../components/ui/FlameIcon';
import { theme } from '../../config/theme';

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [relationshipType, setRelationshipType] = useState('Dating');
  const [isLongDistance, setIsLongDistance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const RELATIONSHIP_TYPES = ['Dating', 'Engaged', 'Married', 'Partnership'];

  const handleRegister = async () => {
    if (!firstName || !email || !password || !dateOfBirth) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address format.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    // 18+ validation check
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      setErrorMessage('Please enter a valid date of birth (YYYY-MM-DD).');
      return;
    }

    const birthDate = new Date(dateOfBirth);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    if (age < 18) {
      setErrorMessage('Togetherly is exclusively for consenting adults (18+).');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await register({
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        password,
        dateOfBirth,
        relationshipType,
        isLongDistance,
      });
      // Registration successful! Navigation will transition to PairingScreen
    } catch (err: any) {
      const rawMsg = err.message || 'Registration failed. Please try again.';
      setErrorMessage(rawMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <FlameIcon size={24} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Space</Text>
          <Text style={styles.subtitle}>Begin your shared journey together</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            label="Your First Name"
            placeholder="e.g. Jordan"
            value={firstName}
            onChangeText={setFirstName}
          />

          <Input
            label="Email Address"
            placeholder="jordan@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Create Password"
            placeholder="••••••••••••"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <Input
            label="Date of Birth (18+ Requirement)"
            placeholder="YYYY-MM-DD"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />

          {/* Relationship Type Selector */}
          <Text style={styles.sectionLabel}>Relationship Stage</Text>
          <View style={styles.typesRow}>
            {RELATIONSHIP_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setRelationshipType(t)}
                style={[
                  styles.typePill,
                  relationshipType === t && styles.typePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    relationshipType === t && styles.typeTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Distance Mode */}
          <Text style={styles.sectionLabel}>Living Arrangement</Text>
          <View style={styles.typesRow}>
            <TouchableOpacity
              onPress={() => setIsLongDistance(false)}
              style={[styles.typePill, !isLongDistance && styles.typePillActive]}
            >
              <Text style={[styles.typeText, !isLongDistance && styles.typeTextActive]}>
                Living Together / Nearby
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsLongDistance(true)}
              style={[styles.typePill, isLongDistance && styles.typePillActive]}
            >
              <Text style={[styles.typeText, isLongDistance && styles.typeTextActive]}>
                Long Distance
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Create Sanctuary Account"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            variant="primary"
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  backBtn: {
    padding: 8,
  },
  content: {
    paddingHorizontal: theme.spacing['2xl'],
    paddingBottom: 40,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: theme.typography.sizes['3xl'],
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 6,
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
  },
  form: {
    marginTop: 6,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 6,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  typePillActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  typeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
  },
  typeTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
  },
});

