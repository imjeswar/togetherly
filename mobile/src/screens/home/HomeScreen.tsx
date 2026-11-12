import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Heart,
  Calendar,
  Flame,
  MessageSquareHeart,
  Palette,
  Camera,
  Gamepad2,
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useCouple } from '../../context/CoupleContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { FlameIcon } from '../../components/ui/FlameIcon';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { theme } from '../../config/theme';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    dashboard,
    partner,
    relationship,
    dailyQuestion,
    isLoading,
    refreshDashboard,
  } = useCouple();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const daysTogether = relationship?.daysTogether ?? 1;
  const streakCount = relationship?.streakCount ?? 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshDashboard}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userNameText}>{user?.firstName || 'Love'}</Text>
          </View>

          <View style={styles.couplesRow}>
            <Avatar url={user?.avatarUrl} name={user?.firstName} size={42} />
            <View style={styles.flameConnector}>
              <FlameIcon size={20} isLit />
            </View>
            <Avatar
              url={partner?.avatarUrl}
              name={partner?.firstName || 'Partner'}
              size={42}
            />
          </View>
        </View>

        {/* Romantic Banner Heading */}
        <View style={styles.heroHeading}>
          <Text style={styles.headline}>Little moments make a big love.</Text>
        </View>

        {/* Relationship Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statBox}>
            <View style={styles.statIconCircle}>
              <Calendar size={18} color={theme.colors.secondary} />
            </View>
            <Text style={styles.statValue}>{daysTogether}</Text>
            <Text style={styles.statLabel}>Days Together</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <View style={styles.statIconCircle}>
              <Flame size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.statValue}>{streakCount}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <View style={styles.statIconCircle}>
              <Sparkles size={18} color={theme.colors.flameRose} />
            </View>
            <Text style={styles.statValue}>{relationship?.couplePoints ?? 50}</Text>
            <Text style={styles.statLabel}>Spark Points</Text>
          </View>
        </Card>

        {/* Daily Shared Moment Card */}
        <Card highlight style={styles.dailyActivityCard}>
          <View style={styles.dailyHeader}>
            <Badge label="Today's Shared Moment" variant="gold" />
            <FlameIcon size={18} isLit />
          </View>

          <Text style={styles.activityTitle}>
            {dailyQuestion?.text || "What made you smile thinking of us today?"}
          </Text>

          <Text style={styles.activitySubtitle}>
            {dailyQuestion?.bothAnswered
              ? '✨ Both of you answered! Tap to read each other’s responses.'
              : dailyQuestion?.userAnswer
              ? `You answered! Waiting for ${partner?.firstName || 'your partner'}...`
              : 'Answer together to unlock each other’s thoughts.'}
          </Text>

          <Button
            title={
              dailyQuestion?.bothAnswered
                ? 'Read Mutual Answers'
                : dailyQuestion?.userAnswer
                ? 'View Your Answer'
                : 'Share Your Answer'
            }
            onPress={() => navigation.navigate('DailyQuestion')}
            variant="primary"
            size="md"
            style={styles.activityActionBtn}
          />
        </Card>

        {/* Quick Sanctuary Actions */}
        <Text style={styles.sectionTitle}>Intimate Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('LoveNotes')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(232, 160, 168, 0.15)' }]}>
              <MessageSquareHeart size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionCardTitle}>Love Note</Text>
            <Text style={styles.actionCardSub}>Surprise message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('QuickDrawing')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(217, 183, 126, 0.15)' }]}>
              <Palette size={22} color={theme.colors.secondary} />
            </View>
            <Text style={styles.actionCardTitle}>Draw Together</Text>
            <Text style={styles.actionCardSub}>Quick canvas sketch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('PhotoMoments')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
              <Camera size={22} color="#F43F5E" />
            </View>
            <Text style={styles.actionCardTitle}>Photo Moment</Text>
            <Text style={styles.actionCardSub}>Daily photo snap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Games')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
              <Gamepad2 size={22} color="#C084FC" />
            </View>
            <Text style={styles.actionCardTitle}>Couples Games</Text>
            <Text style={styles.actionCardSub}>7 playful quizzes</Text>
          </TouchableOpacity>
        </View>

        {/* Security & Sanctuary Health */}
        <TouchableOpacity
          style={styles.securityBanner}
          onPress={() => navigation.navigate('Security')}
          activeOpacity={0.7}
        >
          <View style={styles.securityLeft}>
            <Shield size={18} color={theme.colors.secondary} />
            <Text style={styles.securityText}>Sanctuary Protected with E2EE & Biometrics</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 20,
  },
  greetingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
  },
  userNameText: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  couplesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameConnector: {
    padding: 2,
  },
  heroHeading: {
    marginBottom: 16,
  },
  headline: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: '800',
    color: theme.colors.primary,
    lineHeight: 32,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 18,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.cardBorder,
  },
  dailyActivityCard: {
    padding: 20,
    marginBottom: 24,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 26,
    marginBottom: 8,
  },
  activitySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 18,
  },
  activityActionBtn: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionCardSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  securityText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '500',
  },
});

