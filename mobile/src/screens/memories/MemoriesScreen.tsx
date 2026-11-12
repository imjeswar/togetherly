import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Sparkles, Image as ImageIcon, Palette, Heart, Calendar } from 'lucide-react-native';
import { api } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import { useCouple } from '../../context/CoupleContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const MemoriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { partner } = useCouple();

  const [memories, setMemories] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const res = await api.getMemories();
      if (Array.isArray(res)) {
        setMemories(res);
        await offlineStorage.saveMemories(res);
      }
    } catch {
      const cached = await offlineStorage.getCachedMemories();
      setMemories(cached);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter((m) => {
    if (filter === 'ALL') return true;
    return m.type === filter;
  });

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'PHOTO':
        return <ImageIcon size={16} color={theme.colors.primary} />;
      case 'DRAWING':
        return <Palette size={16} color={theme.colors.secondary} />;
      case 'LOVE_NOTE':
        return <Heart size={16} color="#F43F5E" />;
      default:
        return <Sparkles size={16} color={theme.colors.secondary} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Relationship Memories</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Your Shared History</Text>
          <Text style={styles.bannerSub}>
            Every moment, drawing, and love note preserved in your private sanctuary.
          </Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          {['ALL', 'PHOTO', 'DRAWING', 'LOVE_NOTE', 'MILESTONE'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredMemories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={44} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No memories recorded yet</Text>
            <Text style={styles.emptySub}>
              Share daily questions, photos, drawings, and love notes to build your memory lane!
            </Text>
          </View>
        ) : (
          filteredMemories.map((mem) => (
            <Card key={mem.id} style={styles.memoryCard}>
              <View style={styles.memoryHeader}>
                <View style={styles.typeBadge}>
                  {getMemoryIcon(mem.type)}
                  <Text style={styles.typeText}>{mem.type}</Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(mem.date || mem.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.memoryTitle}>{mem.title}</Text>
              {Boolean(mem.description) && (
                <Text style={styles.memoryDesc}>{mem.description}</Text>
              )}

              {Boolean(mem.mediaUrl) && (
                <Image
                  source={{ uri: mem.mediaUrl }}
                  style={styles.memoryImage}
                  resizeMode="cover"
                />
              )}
            </Card>
          ))
        )}
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  banner: {
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  bannerSub: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptySub: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  memoryCard: {
    padding: 18,
    marginBottom: 14,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  memoryTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  memoryDesc: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  memoryImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.radii.lg,
    marginTop: 12,
    backgroundColor: '#14101A',
  },
});

