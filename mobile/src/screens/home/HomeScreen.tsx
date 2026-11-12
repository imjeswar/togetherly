import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Palette,
  Camera,
  PenTool,
  Settings as SettingsIcon,
  Sparkles,
  Heart,
  ChevronRight,
  Wifi,
  WifiOff,
  Clock,
  CheckCheck,
  LogOut,
  X,
  Edit2,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { offlineStorage } from '../../services/offlineStorage';
import { ENV } from '../../config/env';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FlameIcon } from '../../components/ui/FlameIcon';
import { Stroke } from '../../components/drawing/Canvas';
import Svg, { Path } from 'react-native-svg';
import { widgetBridge } from '../../services/widgetBridge';
import { theme } from '../../config/theme';

function parseStrokes(canvasData: any): Stroke[] {
  if (!canvasData) return [];
  if (Array.isArray(canvasData)) return canvasData;
  if (typeof canvasData === 'string') {
    try {
      let parsed = JSON.parse(canvasData);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = ENV.API_BASE_URL.replace(/\/api\/?$/, '');
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${base}${clean}`;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    space,
    partner,
    userNickname,
    partnerOnline,
    socketStatus,
    unpair,
    updateNickname,
    refreshStatus,
  } = useAuth();

  const [recentDrawings, setRecentDrawings] = useState<any[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingName, setEditingName] = useState(userNickname);
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  const loadRecentContent = useCallback(async () => {
    // 1. Instantly show SQLite cached content while network loads
    try {
      const cached = await offlineStorage.getCachedDrawings();
      if (cached && cached.length > 0) {
        setRecentDrawings(cached);
        // Sync widget with latest cached drawing
        if (cached[0].canvasData) {
          widgetBridge.updateDrawingWidget(cached[0].title || 'Our Latest Doodle', cached[0].canvasData);
        }
      }
    } catch {}

    // 2. Fetch fresh gallery from cloud
    try {
      const [drawingsRes, photosRes] = await Promise.allSettled([
        api.getDrawingsGallery(),
        api.getPhotosGallery(),
      ]);

      if (drawingsRes.status === 'fulfilled' && drawingsRes.value?.drawings) {
        const cached = await offlineStorage.getCachedDrawings();
        const cachedMap = new Map(cached.map((c) => [c.id, c]));

        // Merge with local cache so canvasData is never wiped out
        const mergedDrawings = drawingsRes.value.drawings.map((d: any) => {
          const local = cachedMap.get(d.id);
          const canvasData = d.canvasData || local?.canvasData || '';
          return {
            ...d,
            canvasData,
          };
        });

        setRecentDrawings(mergedDrawings);

        // Update drawing widget
        if (mergedDrawings.length > 0 && mergedDrawings[0].canvasData) {
          widgetBridge.updateDrawingWidget(
            mergedDrawings[0].title || 'Our Latest Doodle',
            mergedDrawings[0].canvasData
          );
        }

        // Persist to local SQLite
        for (const d of mergedDrawings) {
          if (d.canvasData) {
            await offlineStorage.saveDrawingDraft(d.id, d.title || 'Drawing', d.canvasData, d.previewUrl);
          }
        }
      }
      if (photosRes.status === 'fulfilled' && photosRes.value?.photos) {
        setRecentPhotos(photosRes.value.photos);
        if (photosRes.value.photos.length > 0) {
          const p = photosRes.value.photos[0];
          widgetBridge.updatePhotoWidget(resolveMediaUrl(p.photoUrl), p.caption);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadRecentContent();

    // Listen to real-time incoming drawings and photos
    const unsubDrawing = socketService.on('incoming_drawing', async (drawing: any) => {
      const formatted = {
        ...drawing,
        id: drawing.drawingId || drawing.id || `draw_${Date.now()}`,
        isFromPartner: true,
        itemType: 'DRAWING',
        createdAt: drawing.createdAt || new Date().toISOString(),
      };
      setRecentDrawings((prev) => [formatted, ...prev]);

      if (drawing.canvasData) {
        await offlineStorage.saveDrawingDraft(
          formatted.id,
          drawing.title || 'Partner Drawing',
          drawing.canvasData,
          drawing.previewUrl
        );
        // Immediately refresh Quick Sketch widget with the actual artwork!
        await widgetBridge.updateDrawingWidget(
          drawing.title || 'Doodle from ' + (partner?.nickname || 'Partner'),
          drawing.canvasData
        );
      }
    });

    const unsubPhoto = socketService.on('incoming_photo', async (photo: any) => {
      const formatted = {
        ...photo,
        id: photo.photoId || photo.id || `photo_${Date.now()}`,
        isFromPartner: true,
        itemType: 'PHOTO',
        createdAt: photo.createdAt || new Date().toISOString(),
      };
      setRecentPhotos((prev) => [formatted, ...prev]);

      if (photo.photoUrl) {
        // Immediately refresh Our Photos widget with the received photo!
        await widgetBridge.updatePhotoWidget(resolveMediaUrl(photo.photoUrl), photo.caption);
      }
    });

    return () => {
      unsubDrawing?.();
      unsubPhoto?.();
    };
  }, [loadRecentContent, partner?.nickname]);

  // Sync Our Little Space widget on presence changes
  useEffect(() => {
    widgetBridge.updateSpaceWidget(
      partner?.nickname || 'My Love',
      partnerOnline,
      space?.daysTogether || 1
    );
  }, [partner?.nickname, partnerOnline, space?.daysTogether]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshStatus(), loadRecentContent()]);
    setRefreshing(false);
  };

  const handleSaveNickname = async () => {
    if (editingName.trim()) {
      await updateNickname(editingName.trim());
      setSettingsOpen(false);
    }
  };

  const handleConfirmUnpair = () => {
    Alert.alert(
      'Unpair Sanctuary',
      'Are you sure you want to disconnect? This will unpair both devices from this shared space.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            setSettingsOpen(false);
            await unpair();
          },
        },
      ]
    );
  };

  // Combine drawings and photos chronologically
  const combinedFeed = [
    ...recentDrawings.map((d) => ({ ...d, itemType: 'DRAWING' })),
    ...recentPhotos.map((p) => ({ ...p, itemType: 'PHOTO' })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.brandRow}>
          <FlameIcon size={26} color={theme.colors.primary} />
          <Text style={styles.brandTitle}>Togetherly</Text>
        </View>

        {/* Partner Presence Pill */}
        <View style={styles.partnerPill}>
          <View
            style={[
              styles.onlineDot,
              { backgroundColor: partnerOnline ? theme.colors.success : theme.colors.textMuted },
            ]}
          />
          <Text style={styles.partnerPillText} numberOfLines={1}>
            {partner?.nickname || 'Partner'}
          </Text>
          <Text style={styles.partnerStatusSub}>
            {partnerOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {/* Settings / Profile Button */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            setEditingName(userNickname);
            setSettingsOpen(true);
          }}
        >
          <SettingsIcon size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD: SHARED CANVAS */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Drawing')}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.pulseIconBox}>
                <Sparkles size={16} color={theme.colors.gold} />
              </View>
              <Text style={styles.heroBadgeText}>Real-Time Co-Drawing</Text>
            </View>

            <Text style={styles.heroTitle}>Shared Canvas</Text>
            <Text style={styles.heroDescription}>
              Draw simultaneously together in real time on a living canvas.
            </Text>

            <View style={styles.heroButton}>
              <Palette size={18} color="#FFF8F5" />
              <Text style={styles.heroButtonText}>Open Shared Canvas</Text>
              <ChevronRight size={18} color="#FFF8F5" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ROW OF 2 ACTION CARDS: QUICK DRAW & INSTANT PHOTO */}
        <View style={styles.actionsRow}>
          {/* QUICK DRAW */}
          <TouchableOpacity
            style={[styles.actionCard, { borderColor: 'rgba(232, 160, 168, 0.35)' }]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('QuickDrawing')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(232, 160, 168, 0.2)' }]}>
              <PenTool size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Quick Draw</Text>
            <Text style={styles.cardSubtitle}>Sketch & send a sweet doodle</Text>
          </TouchableOpacity>

          {/* INSTANT PHOTO */}
          <TouchableOpacity
            style={[styles.actionCard, { borderColor: 'rgba(217, 183, 126, 0.35)' }]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('PhotoMoments')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: 'rgba(217, 183, 126, 0.2)' }]}>
              <Camera size={22} color={theme.colors.gold} />
            </View>
            <Text style={styles.cardTitle}>Instant Photo</Text>
            <Text style={styles.cardSubtitle}>Share a live moment</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION: RECEIVED FROM PARTNER / RECENT EXCHANGES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Received from {partner?.nickname || 'Partner'}</Text>
          <Text style={styles.sectionSub}>Recent drawings & photo moments</Text>
        </View>

        {combinedFeed.length === 0 ? (
          <View style={styles.emptyFeedBox}>
            <Heart size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyFeedTitle}>No exchanges yet</Text>
            <Text style={styles.emptyFeedText}>
              Send a Quick Draw or snap a photo to surprise your partner!
            </Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {combinedFeed.map((item, index) => {
              const strokes = parseStrokes(item.canvasData);
              const hasStrokes = strokes.length > 0;
              const mediaUri = resolveMediaUrl(item.photoUrl || item.previewUrl);

              return (
                <TouchableOpacity
                  key={item.id || index}
                  style={styles.gridItem}
                  activeOpacity={0.85}
                  onPress={() => setPreviewItem(item)}
                >
                  {hasStrokes ? (
                    <View style={styles.gridCanvasBox}>
                      <Svg viewBox="0 0 360 360" style={StyleSheet.absoluteFill}>
                        {strokes.map((s, idx) => (
                          <Path
                            key={`grid-s-${idx}`}
                            d={s.path}
                            stroke={s.color}
                            strokeWidth={Math.max(2, s.width * 0.9)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        ))}
                      </Svg>
                    </View>
                  ) : mediaUri ? (
                    <Image
                      source={{ uri: mediaUri }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.gridPlaceholder}>
                      <PenTool size={24} color={theme.colors.primary} />
                    </View>
                  )}

                  <View style={styles.gridOverlay}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {item.itemType === 'DRAWING' ? 'Drawing' : 'Photo'}
                      </Text>
                    </View>
                    <Text style={styles.gridTime}>
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FULLSCREEN PREVIEW MODAL */}
      <Modal visible={Boolean(previewItem)} transparent animationType="fade">
        <View style={styles.previewBackdrop}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewTitle}>
                  {previewItem?.title || (previewItem?.itemType === 'DRAWING' ? 'Sweet Drawing' : 'Photo Moment')}
                </Text>
                <Text style={styles.previewSubtitle}>
                  {previewItem?.isFromPartner
                    ? `From ${partner?.nickname || 'Partner'}`
                    : 'Sent by You'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewItem(null)} style={styles.closeBtn}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewBody}>
              {previewItem?.canvasData && parseStrokes(previewItem.canvasData).length > 0 ? (
                <View style={styles.fullDrawingContainer}>
                  <Svg viewBox="0 0 360 420" style={StyleSheet.absoluteFill}>
                    {parseStrokes(previewItem.canvasData).map((s, idx) => (
                      <Path
                        key={`modal-s-${idx}`}
                        d={s.path}
                        stroke={s.color}
                        strokeWidth={s.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ))}
                  </Svg>
                </View>
              ) : previewItem?.photoUrl || previewItem?.previewUrl ? (
                <Image
                  source={{ uri: resolveMediaUrl(previewItem.photoUrl || previewItem.previewUrl) }}
                  style={styles.previewFullImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.centerNotice}>
                  <PenTool size={42} color={theme.colors.primary} />
                  <Text style={styles.emptyNoticeText}>
                    A sweet doodle from {partner?.nickname || 'your partner'}
                  </Text>
                </View>
              )}
              {previewItem?.caption ? (
                <Text style={styles.previewCaption}>{previewItem.caption}</Text>
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* SETTINGS & UNPAIR MODAL */}
      <Modal visible={settingsOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sanctuary Settings</Text>
              <TouchableOpacity onPress={() => setSettingsOpen(false)}>
                <X size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Your Nickname</Text>
              <Input
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Enter nickname"
                style={{ marginBottom: 16 }}
              />

              <Button title="Save Nickname" onPress={handleSaveNickname} />

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Days in Sanctuary</Text>
                <Text style={styles.infoValue}>{space?.daysTogether || 1} days</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Real-time Link</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: socketStatus === 'connected' ? theme.colors.success : theme.colors.error },
                  ]}
                >
                  {socketStatus === 'connected' ? 'Connected' : 'Offline'}
                </Text>
              </View>

              <TouchableOpacity style={styles.unpairButton} onPress={handleConfirmUnpair}>
                <LogOut size={18} color={theme.colors.error} />
                <Text style={styles.unpairText}>Unpair Sanctuary</Text>
              </TouchableOpacity>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  partnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    maxWidth: 160,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  partnerPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  partnerStatusSub: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: 'rgba(232, 160, 168, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.35)',
    padding: 22,
    marginBottom: 20,
  },
  heroContent: {
    gap: 6,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseIconBox: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(217, 183, 126, 0.2)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  heroDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    gap: 8,
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF8F5',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyFeedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyFeedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 12,
  },
  emptyFeedText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridCanvasBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#16121C',
  },
  fullDrawingContainer: {
    width: '100%',
    height: 420,
    backgroundColor: '#16121C',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  centerNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  emptyNoticeText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  gridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 160, 168, 0.08)',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  typeBadge: {
    backgroundColor: 'rgba(232, 160, 168, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF8F5',
  },
  gridTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  closeBtn: {
    padding: 8,
  },
  previewBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewFullImage: {
    width: '100%',
    height: '80%',
    borderRadius: 16,
  },
  previewCaption: {
    color: '#FFF',
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalBody: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  unpairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: 14,
  },
  unpairText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
});
