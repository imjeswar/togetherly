import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send, Sparkles, CheckCheck, Clock } from 'lucide-react-native';
import { Canvas, Stroke } from '../../components/drawing/Canvas';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import { widgetBridge } from '../../services/widgetBridge';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../config/theme';

export const QuickDrawingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { partner, partnerOnline } = useAuth();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [sending, setSending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'DELIVERED'>('IDLE');

  const handleSendDrawing = async () => {
    if (strokes.length === 0) {
      Alert.alert('Empty Canvas', 'Draw a quick doodle, heart, or message for your partner first!');
      return;
    }

    setSending(true);
    setDeliveryStatus('SENDING');
    const canvasData = JSON.stringify(strokes);
    const eventId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // 1. Save locally to SQLite immediately so user never loses it
      await offlineStorage.saveDrawingDraft(eventId, 'Quick Sketch', canvasData);
      await widgetBridge.updateDrawingWidget('Quick Doodle', canvasData);

      // 2. Transmit to backend
      const res = await api.sendQuickDraw({
        eventId,
        canvasData,
        title: 'Quick Doodle',
      });

      if (res?.deliveryStatus === 'DELIVERED') {
        setDeliveryStatus('DELIVERED');
        Alert.alert('Delivered! ✨', `Your drawing was delivered instantly to ${partner?.nickname || 'your partner'}!`, [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        setDeliveryStatus('SENT');
        Alert.alert(
          'Sent! 💌',
          `${partner?.nickname || 'Your partner'} is currently offline. Your drawing is queued and will appear the moment they open the app.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch {
      Alert.alert(
        'Saved Locally',
        'Your drawing is saved safely on your device and will be sent automatically when your internet reconnects.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Quick Draw</Text>
          <Text style={styles.subtitle}>
            To {partner?.nickname || 'Partner'} • {partnerOnline ? 'Online now' : 'Offline'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.canvasContainer}>
        <Canvas height={420} initialStrokes={strokes} onStrokesChange={setStrokes} />
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.sendButton, strokes.length === 0 && styles.sendDisabled]}
          onPress={handleSendDrawing}
          disabled={sending || strokes.length === 0}
          activeOpacity={0.88}
        >
          {sending ? (
            <ActivityIndicator color="#FFF8F5" size="small" />
          ) : (
            <>
              <Send size={18} color="#FFF8F5" />
              <Text style={styles.sendButtonText}>Send to {partner?.nickname || 'Partner'}</Text>
            </>
          )}
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  canvasContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF8F5',
  },
});
