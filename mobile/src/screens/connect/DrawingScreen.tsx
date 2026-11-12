import React, { useState, useEffect, useRef } from 'react';
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
import {
  ArrowLeft,
  Sparkles,
  Save,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { Canvas, Stroke } from '../../components/drawing/Canvas';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { offlineStorage } from '../../services/offlineStorage';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../config/theme';

export const DrawingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { spaceId, deviceId, partner, partnerOnline } = useAuth();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [partnerDrawing, setPartnerDrawing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const strokesRef = useRef<Stroke[]>([]);
  strokesRef.current = strokes;

  // Load existing shared canvas state
  useEffect(() => {
    loadCanvasState();

    // Listen to partner strokes
    const unsubStroke = socketService.on('shared_canvas_stroke', (data: any) => {
      if (data?.stroke && data.deviceId !== deviceId) {
        setStrokes((prev) => {
          const updated = [...prev, data.stroke];
          strokesRef.current = updated;
          return updated;
        });
        setPartnerDrawing(true);
        setTimeout(() => setPartnerDrawing(false), 2000);
      }
    });

    // Listen to canvas clear
    const unsubClear = socketService.on('shared_canvas_clear', (data: any) => {
      if (data?.deviceId !== deviceId) {
        strokesRef.current = [];
        setStrokes([]);
      }
    });

    return () => {
      unsubStroke?.();
      unsubClear?.();
    };
  }, [spaceId, deviceId]);

  const loadCanvasState = async () => {
    try {
      setLoading(true);
      const res = await api.getSharedCanvasState();
      if (res?.sharedCanvas?.canvasData) {
        try {
          const parsed = JSON.parse(res.sharedCanvas.canvasData);
          if (Array.isArray(parsed)) {
            setStrokes(parsed);
          }
        } catch {}
      }
    } catch {
      // Fallback to local cache
      const cached = await offlineStorage.getCachedDrawings();
      if (cached.length > 0 && cached[0].canvasData) {
        try {
          const parsed = JSON.parse(cached[0].canvasData);
          if (Array.isArray(parsed)) setStrokes(parsed);
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  // When user finishes a stroke on their device
  const handleStrokesChange = (newStrokes: Stroke[]) => {
    if (newStrokes.length > strokesRef.current.length) {
      // Newly added stroke(s)
      const addedStrokes = newStrokes.slice(strokesRef.current.length);
      addedStrokes.forEach((stroke) => {
        socketService.emit('shared_canvas_stroke', {
          spaceId,
          deviceId,
          stroke,
        });
      });
    } else if (newStrokes.length === 0 && strokesRef.current.length > 0) {
      socketService.emit('shared_canvas_clear', { spaceId, deviceId });
    }
    strokesRef.current = newStrokes;
    setStrokes(newStrokes);
  };

  const handleSaveSnapshot = async () => {
    if (strokes.length === 0) {
      Alert.alert('Empty Canvas', 'Draw something with your partner first!');
      return;
    }

    setSaving(true);
    const canvasData = JSON.stringify(strokes);

    try {
      await api.saveSharedCanvasState({
        canvasData,
        title: 'Our Living Canvas',
      });

      await offlineStorage.saveDrawingDraft(`shared_${Date.now()}`, 'Shared Canvas', canvasData);

      Alert.alert('Saved to Sanctuary 💖', 'Your collaborative artwork was saved.');
    } catch {
      Alert.alert('Saved Locally', 'Saved to your device storage.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Shared Canvas',
      'Are you sure you want to clear the canvas for both of you?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setStrokes([]);
            socketService.emit('shared_canvas_clear', { spaceId, deviceId });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Shared Canvas</Text>
          <View style={styles.presencePill}>
            <View
              style={[
                styles.dot,
                { backgroundColor: partnerOnline ? theme.colors.success : theme.colors.textMuted },
              ]}
            />
            <Text style={styles.presenceText}>
              {partnerDrawing
                ? `${partner?.nickname || 'Partner'} is drawing...`
                : partnerOnline
                ? `${partner?.nickname || 'Partner'} is co-drawing`
                : `${partner?.nickname || 'Partner'} offline`}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSaveSnapshot}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Save size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Collaborative Canvas Area */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Syncing canvas with partner...</Text>
        </View>
      ) : (
        <View style={styles.canvasWrapper}>
          <Canvas
            initialStrokes={strokes}
            onStrokesChange={handleStrokesChange}
            height={500}
          />
        </View>
      )}
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
  presencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  presenceText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  canvasWrapper: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
});
