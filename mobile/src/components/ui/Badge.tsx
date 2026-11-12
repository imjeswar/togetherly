import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../config/theme';

interface BadgeProps {
  label: string;
  variant?: 'rose' | 'gold' | 'neutral' | 'success';
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'rose', icon, style }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'rose':
        return styles.rose;
      case 'gold':
        return styles.gold;
      case 'success':
        return styles.success;
      case 'neutral':
        return styles.neutral;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'rose':
        return styles.roseText;
      case 'gold':
        return styles.goldText;
      case 'success':
        return styles.successText;
      case 'neutral':
        return styles.neutralText;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      {icon}
      <Text style={[styles.text, getTextStyle()]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
  },
  rose: {
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.3)',
  },
  roseText: {
    color: theme.colors.primary,
  },
  gold: {
    backgroundColor: theme.colors.secondaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(217, 183, 126, 0.3)',
  },
  goldText: {
    color: theme.colors.secondary,
  },
  success: {
    backgroundColor: theme.colors.successMuted,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  successText: {
    color: theme.colors.success,
  },
  neutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  neutralText: {
    color: theme.colors.textSecondary,
  },
  text: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
});

