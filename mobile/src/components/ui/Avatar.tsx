import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { theme } from '../../config/theme';

interface AvatarProps {
  url?: string;
  name?: string;
  size?: number;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name = 'U',
  size = 40,
  showOnlineStatus = false,
  isOnline = false,
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}
      {showOnlineStatus && (
        <View
          style={[
            styles.statusDot,
            isOnline ? styles.onlineDot : styles.offlineDot,
            { right: 0, bottom: 0 },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 160, 168, 0.4)',
  },
  image: {
    backgroundColor: theme.colors.card,
  },
  fallback: {
    backgroundColor: '#2A2332',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  statusDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  onlineDot: {
    backgroundColor: theme.colors.success,
  },
  offlineDot: {
    backgroundColor: theme.colors.textMuted,
  },
});

