import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send, Sparkles } from 'lucide-react-native';
import { Canvas, Stroke } from '../../components/drawing/Canvas';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import { useCouple } from '../../context/CoupleContext';
import { theme } from '../../config/theme';

export const QuickDrawingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { partner } = useCouple();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [sending, setSending] = useState(false);

  const handleSendDrawing = async () => {
    if (strokes.length === 0) {
      Alert.alert('Empty Canvas', 'Draw a quick doodle, heart, or note for your partner first!');
      return;
    }

    setSending(true);
    const canvasData = JSON.stringify(strokes);
    const id = `draw_${Date.now()}`;

    try {
      // Save locally to SQLite immediately
      await offlineStorage.saveDrawingDraft(id, 'Quick Sketch', canvasData);

      // Send via API or queue if offline
      await api.saveDrawing({
        title: 'Quick Heart Sketch',
        canvasData,
      });

      Alert.alert('Sent!', `Your drawing was sent to ${partner?.firstName || 'your partner'}!`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Saved Offline', 'Your drawing is saved safely on your device and will sync as soon as you reconnect.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Sparkles size={16} color={theme.colors.secondary} />
          <Text style={styles.barTitle}>Quick Drawing</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.hintText}>
          Doodle something sweet for {partner?.firstName || 'your partner'}. It synchronizes instantly!
        </Text>

        <Canvas height={380} onStrokesChange={setStrokes} />

        <Button
          title={`Send to ${partner?.firstName || 'Partner'}`}
          onPress={handleSendDrawing}
          loading={sending}
          disabled={strokes.length === 0}
          icon={<Send size={18} color="#0D0B10" />}
          variant="primary"
          size="lg"
          style={styles.sendBtn}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  hintText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
    marginVertical: 8,
  },
  sendBtn: {
    marginTop: 14,
  },
});

