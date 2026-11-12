import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Heart, X, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { api } from '../../services/api';
import { useCouple } from '../../context/CoupleContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const DateIdeasScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { partner } = useCouple();

  const [dateIdeas, setDateIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadDateIdeas();
  }, []);

  const loadDateIdeas = async () => {
    setLoading(true);
    try {
      const res = await api.getDateIdeas();
      if (Array.isArray(res)) {
        setDateIdeas(res);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (liked: boolean) => {
    if (currentIndex >= dateIdeas.length) return;
    const current = dateIdeas[currentIndex];

    try {
      const res = await api.swipeDateIdea(current.id, liked);
      if (liked && res?.isMutualMatch) {
        Alert.alert(
          'It’s a Match! 🎉',
          `Both you and ${partner?.firstName || 'your partner'} want to go on this date: "${current.title}"!`
        );
      }
    } catch {}

    setCurrentIndex((prev) => prev + 1);
  };

  const currentIdea = dateIdeas[currentIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Date Ideas Deck</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Mutual Date Matcher</Text>
          <Text style={styles.bannerSub}>
            Swipe right on activities you'd love. When both of you say yes, it's a match!
          </Text>
        </View>

        {currentIdea ? (
          <View style={styles.cardContainer}>
            <Card highlight style={styles.swipeCard}>
              <View style={styles.tagRow}>
                <Badge label={currentIdea.category || 'Romantic'} variant="rose" />
                <Badge label={currentIdea.budget || '$$'} variant="gold" />
              </View>

              <Text style={styles.ideaTitle}>{currentIdea.title}</Text>
              <Text style={styles.ideaDesc}>{currentIdea.description}</Text>

              {currentIdea.partnerLiked && (
                <View style={styles.partnerLikedNotice}>
                  <Sparkles size={16} color={theme.colors.secondary} />
                  <Text style={styles.partnerLikedText}>
                    {partner?.firstName || 'Your partner'} already likes this!
                  </Text>
                </View>
              )}
            </Card>

            {/* Action buttons */}
            <View style={styles.swipeActions}>
              <TouchableOpacity
                onPress={() => handleSwipe(false)}
                style={[styles.actionBtn, styles.passBtn]}
                activeOpacity={0.8}
              >
                <X size={28} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSwipe(true)}
                style={[styles.actionBtn, styles.likeBtn]}
                activeOpacity={0.8}
              >
                <Heart size={28} color="#0D0B10" fill="#0D0B10" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={48} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>You're All Caught Up!</Text>
            <Text style={styles.emptySub}>
              You've swiped through all available date ideas for now. Check back soon for new adventures!
            </Text>
            <Button
              title="Start Over"
              onPress={() => setCurrentIndex(0)}
              variant="outline"
              size="md"
              style={{ marginTop: 18 }}
            />
          </View>
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  barTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 30,
  },
  banner: {
    marginTop: 6,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  bannerSub: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  swipeCard: {
    padding: 26,
    minHeight: 340,
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  ideaTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 32,
    marginBottom: 12,
  },
  ideaDesc: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  partnerLikedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.secondaryMuted,
  },
  partnerLikedText: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  swipeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 20,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  passBtn: {
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
  },
  likeBtn: {
    backgroundColor: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 14,
  },
  emptySub: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});

