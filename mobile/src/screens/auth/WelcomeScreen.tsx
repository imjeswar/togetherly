import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FlameIcon } from '../../components/ui/FlameIcon';
import { Button } from '../../components/ui/Button';
import { theme } from '../../config/theme';

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <View style={styles.container}>
        <View style={styles.header}>
          <FlameIcon size={64} isLit />
          <Text style={styles.brandTitle}>Togetherly</Text>
          <Text style={styles.tagline}>A little moment. A stronger connection.</Text>
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "Your relationship deserves little moments of magic."
          </Text>
          <Text style={styles.quoteSub}>
            A private romantic sanctuary designed exclusively for the two of you to share daily moments, love notes, games, and memories.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Create Your Space"
            onPress={() => navigation.navigate('Register')}
            size="lg"
            variant="primary"
          />
          <Button
            title="Sign In to Sanctuary"
            onPress={() => navigation.navigate('Login')}
            size="lg"
            variant="outline"
          />
        </View>
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
    paddingHorizontal: theme.spacing['2xl'],
    justifyContent: 'space-between',
    paddingVertical: theme.spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  brandTitle: {
    fontSize: theme.typography.sizes['4xl'],
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 16,
  },
  tagline: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.secondary,
    fontStyle: 'italic',
    marginTop: 6,
  },
  quoteCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii['2xl'],
    padding: theme.spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.2)',
    alignItems: 'center',
  },
  quoteText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  quoteSub: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    gap: 14,
    marginBottom: 20,
  },
});

