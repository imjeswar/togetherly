import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { useSync } from '../../context/SyncContext';
import { theme } from '../../config/theme';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingCount, triggerSync } = useSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isOnline ? styles.syncingBg : styles.offlineBg]}>
      <View style={styles.left}>
        {isOnline ? (
          <RefreshCw size={14} color={theme.colors.secondary} />
        ) : (
          <WifiOff size={14} color={theme.colors.primary} />
        )}
        <Text style={styles.text}>
          {!isOnline
            ? `Offline • ${pendingCount} ${pendingCount === 1 ? 'action' : 'actions'} stored locally`
            : `Syncing ${pendingCount} offline ${pendingCount === 1 ? 'action' : 'actions'}...`}
        </Text>
      </View>
      <TouchableOpacity onPress={triggerSync} style={styles.button} activeOpacity={0.7}>
        <Text style={styles.buttonText}>{isOnline ? 'Sync now' : 'Retry'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  offlineBg: {
    backgroundColor: '#1E1417',
  },
  syncingBg: {
    backgroundColor: '#1C1914',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fontFamilies.medium,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  buttonText: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
});

