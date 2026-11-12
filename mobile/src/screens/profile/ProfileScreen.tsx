import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Shield,
  Download,
  Heart,
  LogOut,
  ChevronRight,
  Flame,
  UserX,
  Activity,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useCouple } from '../../context/CoupleContext';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, refreshUser } = useAuth();
  const { partner, relationship } = useCouple();

  const handleUnpair = () => {
    Alert.alert(
      'Unlink Sanctuary?',
      'Are you sure you want to disconnect from your partner? You can re-pair at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.unpair();
              await refreshUser();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to unpair.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Text style={styles.barTitle}>Your Profile & Sanctuary</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <Card style={styles.userCard}>
          <Avatar url={user?.avatarUrl} name={user?.firstName} size={64} />
          <Text style={styles.userName}>{user?.firstName} {user?.lastName || ''}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.badgeRow}>
            <Badge label={relationship?.relationshipType || 'Together'} variant="rose" />
            <Badge label={`${relationship?.streakCount || 1} Day Streak`} variant="gold" />
          </View>
        </Card>

        {/* Partner Space */}
        <Card style={styles.partnerCard}>
          <View style={styles.partnerHeader}>
            <Heart size={18} color={theme.colors.primary} />
            <Text style={styles.partnerCardTitle}>Partner Sanctuary</Text>
          </View>

          {partner ? (
            <View style={styles.partnerRow}>
              <Avatar url={partner.avatarUrl} name={partner.firstName} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerName}>{partner.firstName}</Text>
                <Text style={styles.partnerSub}>Connected & Synchronized</Text>
              </View>
              <TouchableOpacity onPress={handleUnpair} style={styles.unpairBtn}>
                <Text style={styles.unpairText}>Unpair</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noPartnerBox}>
              <Text style={styles.noPartnerText}>No partner currently connected.</Text>
            </View>
          )}
        </Card>

        {/* Settings Navigation Menu */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Security')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBox}>
              <Shield size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Security & Biometrics</Text>
              <Text style={styles.menuSub}>Face ID, 2FA & E2EE Keys</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('DataExport')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBox}>
              <Download size={20} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Privacy & Data Export</Text>
              <Text style={styles.menuSub}>Export archive & delete account</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Diagnostics')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconBox}>
              <Activity size={20} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>System Diagnostics & QA</Text>
              <Text style={styles.menuSub}>Network, SQLite, E2EE bench & widgets</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={logout}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: theme.colors.errorMuted }]}>
              <LogOut size={20} color={theme.colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuTitle, { color: theme.colors.error }]}>Sign Out</Text>
              <Text style={styles.menuSub}>End local session securely</Text>
            </View>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  barTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  userCard: {
    alignItems: 'center',
    padding: 24,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  userEmail: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  partnerCard: {
    padding: 20,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  partnerCardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerName: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  partnerSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  unpairBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.errorMuted,
  },
  unpairText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  noPartnerBox: {
    paddingVertical: 8,
  },
  noPartnerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  menuContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  menuSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

