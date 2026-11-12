import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../../config/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryBtn;
      case 'secondary':
        return styles.secondaryBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'ghost':
        return styles.ghostBtn;
      case 'danger':
        return styles.dangerBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      case 'danger':
        return styles.dangerText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.smSize;
      case 'md':
        return styles.mdSize;
      case 'lg':
        return styles.lgSize;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        getContainerStyle(),
        getSizeStyle(),
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#0D0B10' : theme.colors.primary}
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.baseText, getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.xl,
    gap: 8,
  },
  smSize: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mdSize: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  lgSize: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    color: '#0D0B10',
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: theme.colors.secondaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(217, 183, 126, 0.4)',
  },
  secondaryText: {
    color: theme.colors.secondary,
    fontWeight: '600',
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  outlineText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dangerBtn: {
    backgroundColor: theme.colors.errorMuted,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  dangerText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontSize: theme.typography.sizes.base,
  },
});

