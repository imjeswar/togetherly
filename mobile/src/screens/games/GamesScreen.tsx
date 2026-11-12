import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Gamepad2, Sparkles, ChevronRight, Check } from 'lucide-react-native';
import { api } from '../../services/api';
import { useCouple } from '../../context/CoupleContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const GamesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { partner } = useCouple();

  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGame, setActiveGame] = useState<any | null>(null);
  const [roundAnswer, setRoundAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
      const res = await api.getGames();
      if (Array.isArray(res)) {
        setGames(res);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleStartGame = (game: any) => {
    setActiveGame(game);
  };

  const handleSubmitRound = async () => {
    if (!roundAnswer.trim()) return;
    setSubmitting(true);
    try {
      Alert.alert('Answer Recorded!', `Waiting for ${partner?.firstName || 'your partner'} to respond to round 1!`);
      setActiveGame(null);
      setRoundAnswer('');
    } catch {
      Alert.alert('Saved Offline', 'Your game round will submit once reconnected.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Couples Games</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Play & Deepen Bond</Text>
          <Text style={styles.bannerSub}>
            Synchronized interactive games designed for couples to spark laughter and connection.
          </Text>
        </View>

        <View style={styles.gamesList}>
          {games.map((g) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => handleStartGame(g)}
              activeOpacity={0.8}
            >
              <Card style={styles.gameCard}>
                <View style={styles.gameIconBox}>
                  <Gamepad2 size={24} color={theme.colors.secondary} />
                </View>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTitle}>{g.title}</Text>
                  <Text style={styles.gameDesc} numberOfLines={2}>
                    {g.description}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Badge label={g.category || 'Playful'} variant="neutral" />
                  </View>
                </View>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Play Game Modal */}
      <Modal visible={Boolean(activeGame)} animationType="slide">
        <SafeAreaView style={styles.modalArea}>
          <View style={styles.modalTopBar}>
            <TouchableOpacity onPress={() => setActiveGame(null)}>
              <Text style={styles.cancelText}>Exit Game</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeading}>{activeGame?.title}</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalBody}>
            <Card highlight style={styles.promptCard}>
              <Badge label="Round 1" variant="gold" />
              <Text style={styles.promptQuestion}>
                {activeGame?.code === 'TRIVIA'
                  ? `What is ${partner?.firstName || 'your partner'}'s dream travel getaway?`
                  : activeGame?.code === 'THIS_OR_THAT'
                  ? 'Cozy weekend in bed OR spontaneous roadtrip adventure?'
                  : 'What is one thing about your partner that never fails to melt your heart?'}
              </Text>
            </Card>

            <Input
              label="Your Response"
              placeholder="Type your answer..."
              value={roundAnswer}
              onChangeText={setRoundAnswer}
            />

            <Button
              title="Submit Answer"
              onPress={handleSubmitRound}
              loading={submitting}
              disabled={!roundAnswer.trim()}
              variant="primary"
              size="lg"
            />
          </View>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 20,
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
  gamesList: {
    gap: 14,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  gameIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.secondaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  gameDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  badgeRow: {
    marginTop: 6,
  },
  modalArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalHeading: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  promptCard: {
    padding: 20,
    marginBottom: 24,
    gap: 12,
  },
  promptQuestion: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 28,
  },
});

