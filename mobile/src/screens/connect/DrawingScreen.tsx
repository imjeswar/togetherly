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
import { ArrowLeft, Plus, Palette, Send, Eye } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Canvas, Stroke } from '../../components/drawing/Canvas';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { offlineStorage } from '../../services/offlineStorage';
import { useCouple } from '../../context/CoupleContext';
import { theme } from '../../config/theme';

export const DrawingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { partner } = useCouple();

  const [drawings, setDrawings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [currentStrokes, setCurrentStrokes] = useState<Stroke[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<any | null>(null);

  useEffect(() => {
    loadDrawings();
  }, []);

  const loadDrawings = async () => {
    setLoading(true);
    try {
      const res = await api.getDrawings();
      if (Array.isArray(res)) {
        setDrawings(res);
      }
    } catch {
      const cached = await offlineStorage.getCachedDrawings();
      setDrawings(cached);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDrawing = async () => {
    if (currentStrokes.length === 0) {
      Alert.alert('Empty Canvas', 'Please draw something before saving!');
      return;
    }
    const canvasData = JSON.stringify(currentStrokes);
    const drawingTitle = title.trim() || 'Shared Artwork';

    setLoading(true);
    try {
      await api.saveDrawing({
        title: drawingTitle,
        canvasData,
      });
      await offlineStorage.saveDrawingDraft(`draw_${Date.now()}`, drawingTitle, canvasData);
      setIsCreating(false);
      setTitle('');
      setCurrentStrokes([]);
      await loadDrawings();
    } catch {
      await offlineStorage.saveDrawingDraft(`draw_${Date.now()}`, drawingTitle, canvasData);
      Alert.alert('Saved to Offline Sanctuary', 'Your artwork is saved locally and will sync when you reconnect.');
      setIsCreating(false);
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
        <Text style={styles.barTitle}>Shared Canvas</Text>
        <TouchableOpacity onPress={() => setIsCreating(true)} style={styles.addBtn}>
          <Plus size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Intimate Art Gallery</Text>
          <Text style={styles.bannerSub}>
            Express love through collaborative sketches and sweet doodles.
          </Text>
        </View>

        {drawings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Palette size={44} color={theme.colors.secondary} style={{ opacity: 0.6 }} />
            <Text style={styles.emptyTitle}>No drawings yet</Text>
            <Text style={styles.emptySub}>
              Start a new sketch or send a quick doodle to {partner?.firstName || 'your partner'}.
            </Text>
            <Button
              title="Create First Sketch"
              onPress={() => setIsCreating(true)}
              variant="primary"
              size="md"
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          drawings.map((draw) => {
            let strokes: Stroke[] = [];
            try {
              strokes = JSON.parse(draw.canvasData);
            } catch {}

            return (
              <TouchableOpacity
                key={draw.id}
                onPress={() => setSelectedDrawing(draw)}
                activeOpacity={0.8}
              >
                <Card style={styles.drawingCard}>
                  <Text style={styles.drawingTitle}>{draw.title}</Text>
                  <View style={styles.previewBox}>
                    <Svg width="100%" height={160} viewBox="0 0 350 350">
                      {strokes.map((s, idx) => (
                        <Path
                          key={idx}
                          d={s.path}
                          stroke={s.color}
                          strokeWidth={s.width}
                          strokeLinecap="round"
                          fill="none"
                        />
                      ))}
                    </Svg>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(draw.createdAt || Date.now()).toLocaleDateString()}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Drawing Modal */}
      <Modal visible={isCreating} animationType="slide">
        <SafeAreaView style={styles.createModalArea}>
          <View style={styles.createTopBar}>
            <TouchableOpacity onPress={() => setIsCreating(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeading}>New Drawing</Text>
            <TouchableOpacity onPress={handleSaveDrawing} disabled={loading}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createForm}>
            <Input
              placeholder="Title (optional)"
              value={title}
              onChangeText={setTitle}
            />
            <Canvas height={360} onStrokesChange={setCurrentStrokes} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* View Full Drawing Modal */}
      <Modal visible={Boolean(selectedDrawing)} animationType="fade" transparent>
        <View style={styles.viewOverlay}>
          <View style={styles.viewCard}>
            <View style={styles.viewHeader}>
              <Text style={styles.viewTitle}>{selectedDrawing?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedDrawing(null)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fullCanvasBox}>
              <Svg width="100%" height={320} viewBox="0 0 360 360">
                {selectedDrawing?.canvasData ? (
                  (() => {
                    try {
                      const parsed: Stroke[] = JSON.parse(selectedDrawing.canvasData);
                      return parsed.map((s, idx) => (
                        <Path
                          key={idx}
                          d={s.path}
                          stroke={s.color}
                          strokeWidth={s.width}
                          strokeLinecap="round"
                          fill="none"
                        />
                      ));
                    } catch {
                      return null;
                    }
                  })()
                ) : null}
              </Svg>
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
    color: theme.colors.secondary,
  },
  bannerSub: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 30,
  },
  drawingCard: {
    padding: 16,
    marginBottom: 16,
  },
  drawingTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  previewBox: {
    backgroundColor: '#14101A',
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 10,
    textAlign: 'right',
  },
  createModalArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  createTopBar: {
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
    fontSize: theme.typography.sizes.base,
  },
  saveText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
  },
  createForm: {
    padding: 16,
    flex: 1,
  },
  viewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  viewCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii['2xl'],
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  viewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  fullCanvasBox: {
    backgroundColor: '#14101A',
    borderRadius: theme.radii.lg,
    height: 320,
    overflow: 'hidden',
  },
});

