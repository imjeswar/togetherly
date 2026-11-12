import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Lock, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useCouple } from '../../context/CoupleContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { theme } from '../../config/theme';

export const DailyQuestionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { dailyQuestion, partner, answerDailyQuestion } = useCouple();

  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userAnswer = dailyQuestion?.userAnswer;
  const partnerAnswer = dailyQuestion?.partnerAnswer as any;
  const bothAnswered = dailyQuestion?.bothAnswered;

  const handleSubmit = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      await answerDailyQuestion(answerText.trim());
      setAnswerText('');
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.barTitle}>Daily Question</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Question Card */}
          <Card highlight style={styles.questionCard}>
            <View style={styles.tagRow}>
              <Badge label={dailyQuestion?.category || 'Deep Intimacy'} variant="rose" />
              <Badge label={`Level ${dailyQuestion?.intimacyLevel || 2}`} variant="gold" />
            </View>

            <Text style={styles.questionText}>
              {dailyQuestion?.text || "What's your favorite small memory of us this week?"}
            </Text>

            <Text style={styles.intimacyHint}>
              Answers remain private and hidden until both of you have shared your response.
            </Text>
          </Card>

          {/* User's Answer */}
          {userAnswer ? (
            <Card style={styles.answerCard}>
              <View style={styles.authorRow}>
                <Avatar url={user?.avatarUrl} name={user?.firstName} size={32} />
                <Text style={styles.authorName}>Your Answer</Text>
                <CheckCircle2 size={16} color={theme.colors.success} style={{ marginLeft: 'auto' }} />
              </View>
              <Text style={styles.savedAnswerText}>{userAnswer.answer}</Text>
            </Card>
          ) : (
            <Card style={styles.inputCard}>
              <Text style={styles.inputTitle}>Your Honest Answer</Text>
              <Input
                placeholder="Write from the heart..."
                value={answerText}
                onChangeText={setAnswerText}
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />
              <Button
                title="Lock In My Answer"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!answerText.trim()}
                variant="primary"
                size="md"
              />
            </Card>
          )}

          {/* Partner's Answer Card */}
          <Card style={styles.partnerCard}>
            <View style={styles.authorRow}>
              <Avatar url={partner?.avatarUrl} name={partner?.firstName || 'Partner'} size={32} />
              <Text style={styles.authorName}>
                {partner?.firstName || 'Partner'}'s Answer
              </Text>
            </View>

            {bothAnswered && partnerAnswer?.answer ? (
              <Text style={styles.partnerAnswerText}>{partnerAnswer.answer}</Text>
            ) : (
              <View style={styles.lockedBox}>
                <Lock size={24} color={theme.colors.secondary} />
                <Text style={styles.lockedText}>
                  {partnerAnswer?.hasAnswered
                    ? `${partner?.firstName || 'Your partner'} has answered! Submit yours to reveal.`
                    : `Waiting for ${partner?.firstName || 'your partner'} to answer...`}
                </Text>
              </View>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
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
  questionCard: {
    padding: 24,
    marginBottom: 20,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 32,
    marginBottom: 12,
  },
  intimacyHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  inputCard: {
    padding: 20,
    marginBottom: 20,
  },
  inputTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  answerCard: {
    padding: 20,
    marginBottom: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  authorName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  savedAnswerText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  partnerCard: {
    padding: 20,
    marginBottom: 20,
  },
  partnerAnswerText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.secondary,
    lineHeight: 24,
    fontWeight: '500',
  },
  lockedBox: {
    backgroundColor: '#151119',
    borderRadius: theme.radii.lg,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(217, 183, 126, 0.2)',
  },
  lockedText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

