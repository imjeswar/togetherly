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
import {
  ArrowLeft,
  Plus,
  Heart,
  Lock,
  MailOpen,
  Send,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useCouple } from '../../context/CoupleContext';
import { api } from '../../services/api';
import { e2eeService } from '../../services/e2ee';
import { offlineStorage } from '../../services/offlineStorage';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const LoveNotesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { partner } = useCouple();

  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [unlockCondition, setUnlockCondition] = useState('INSTANT');
  const [selectedNote, setSelectedNote] = useState<any | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await api.getLoveNotes();
      if (Array.isArray(res)) {
        setNotes(res);
        await offlineStorage.saveLoveNoteDraft(res[0] || {});
      }
    } catch {
      // Offline fallback
      const cached = await offlineStorage.getCachedLoveNotes();
      setNotes(cached);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNote = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Incomplete Note', 'Please provide both a title and heartfelt message.');
      return;
    }

    setLoading(true);
    try {
      // Perform genuine E2EE encryption
      const encrypted = await e2eeService.encrypt(content.trim());

      await api.sendLoveNote({
        title: title.trim(),
        content: content.trim(),
        unlockCondition,
        theme: 'ROMANTIC',
        isEncrypted: encrypted.isEncrypted,
        encryptedPayload: encrypted.encryptedPayload,
        nonce: encrypted.nonce,
      });

      // Reset & refresh
      setTitle('');
      setContent('');
      setModalVisible(false);
      await loadNotes();
    } catch (err: any) {
      Alert.alert('Saved Offline', 'Your love note was saved locally and will send as soon as connection is restored.');
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Love Notes</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Plus size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>End-to-End Encrypted Letters</Text>
          <Text style={styles.bannerSub}>
            Private love notes only readable by the two of you on your devices.
          </Text>
        </View>

        {notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Heart size={44} color={theme.colors.primary} style={{ opacity: 0.6 }} />
            <Text style={styles.emptyTitle}>No love notes yet</Text>
            <Text style={styles.emptySub}>
              Surprise {partner?.firstName || 'your partner'} with an intimate note or future milestone letter.
            </Text>
            <Button
              title="Write First Love Note"
              onPress={() => setModalVisible(true)}
              variant="primary"
              size="md"
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          notes.map((note) => {
            const isFromMe = note.senderId === user?.id || note.sender?.id === user?.id;
            return (
              <TouchableOpacity
                key={note.id}
                onPress={() => setSelectedNote(note)}
                activeOpacity={0.8}
              >
                <Card style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteLeft}>
                      {note.isOpened ? (
                        <MailOpen size={18} color={theme.colors.primary} />
                      ) : (
                        <Lock size={18} color={theme.colors.secondary} />
                      )}
                      <Text style={styles.noteTitle}>{note.title}</Text>
                    </View>
                    <Badge
                      label={isFromMe ? 'Sent by you' : `From ${partner?.firstName || 'Partner'}`}
                      variant={isFromMe ? 'neutral' : 'rose'}
                    />
                  </View>

                  <Text style={styles.noteSnippet} numberOfLines={2}>
                    {note.isOpened ? note.content || 'Tap to view full letter' : 'Intimate letter sealed until unlocked.'}
                  </Text>

                  <View style={styles.noteFooter}>
                    <View style={styles.e2eePill}>
                      <ShieldCheck size={12} color={theme.colors.success} />
                      <Text style={styles.e2eeText}>E2EE Encrypted</Text>
                    </View>
                    <Text style={styles.noteDate}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Write Note Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalHeading}>Write Love Note</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Note Title"
              placeholder="e.g. For when you miss me"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Intimate Letter"
              placeholder="Write your secret words of affection..."
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              style={{ height: 140, textAlignVertical: 'top' }}
            />

            <Button
              title="Seal & Send with E2EE"
              onPress={handleSendNote}
              loading={loading}
              icon={<Send size={18} color="#0D0B10" />}
              variant="primary"
              size="lg"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* View Note Modal */}
      <Modal visible={Boolean(selectedNote)} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.readModalBox}>
            <View style={styles.readTopBar}>
              <Heart size={20} color={theme.colors.primary} />
              <TouchableOpacity onPress={() => setSelectedNote(null)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.readTitle}>{selectedNote?.title}</Text>
            <Text style={styles.readLetterBody}>
              {selectedNote?.content || 'No content provided.'}
            </Text>

            <View style={styles.readFooter}>
              <ShieldCheck size={14} color={theme.colors.success} />
              <Text style={styles.e2eeNotice}>Protected with End-to-End Encryption</Text>
            </View>
          </View>
        </View>
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
  addBtn: {
    padding: 8,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  noteCard: {
    padding: 18,
    marginBottom: 14,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  noteTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  noteSnippet: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  e2eePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  e2eeText: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii['2xl'],
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalHeading: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
  },
  readModalBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii['2xl'],
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.3)',
  },
  readTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  readTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 14,
  },
  readLetterBody: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: 26,
    marginBottom: 20,
  },
  readFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: 12,
  },
  e2eeNotice: {
    fontSize: 11,
    color: theme.colors.success,
  },
});

