import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Send,
  X,
  Check,
  CheckCheck,
  Clock,
  Download,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { offlineStorage } from '../../services/offlineStorage';
import { widgetBridge } from '../../services/widgetBridge';
import { ENV } from '../../config/env';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { theme } from '../../config/theme';

function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = ENV.API_BASE_URL.replace(/\/api\/?$/, '');
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${base}${clean}`;
}

export const PhotoMomentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { partner, partnerOnline, deviceId } = useAuth();

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'DELIVERED'>('IDLE');
  const [fullViewPhoto, setFullViewPhoto] = useState<any | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getPhotosGallery();
      if (res?.photos) {
        setPhotos(res.photos);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();

    // Listen to real-time incoming photo from partner
    const unsubPhoto = socketService.on('incoming_photo', (photo: any) => {
      setPhotos((prev) => [
        { ...photo, isFromPartner: true, deliveryStatus: 'DELIVERED', createdAt: new Date().toISOString() },
        ...prev,
      ]);
      if (photo?.photoUrl) {
        widgetBridge.updatePhotoWidget(resolveMediaUrl(photo.photoUrl), photo.caption);
      }
      // Mark seen automatically when in photo screen
      if (photo?.photoId) {
        api.markPhotoSeen(photo.photoId).catch(() => {});
      }
    });

    // Listen to delivery status update
    const unsubStatus = socketService.on('delivery_status_update', (update: any) => {
      if (update?.status) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === update.photoId ? { ...p, deliveryStatus: update.status } : p))
        );
      }
    });

    return () => {
      unsubPhoto?.();
      unsubStatus?.();
    };
  }, [loadPhotos]);

  // Compress and prepare image
  const processImage = async (uri: string) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setSelectedImageUri(manipResult.uri);
      setSelectedBase64(`data:image/jpeg;base64,${manipResult.base64}`);
    } catch (err) {
      setSelectedImageUri(uri);
    }
  };

  // Camera Capture
  const handleLaunchCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });

    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      await processImage(res.assets[0].uri);
    }
  };

  // Gallery Picker
  const handlePickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Media library access is needed to select photos.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.85,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!res.canceled && res.assets && res.assets[0]?.uri) {
      await processImage(res.assets[0].uri);
    }
  };

  // Send Photo to Partner
  const handleSendPhoto = async () => {
    if (!selectedBase64 && !selectedImageUri) return;

    setSending(true);
    setDeliveryStatus('SENDING');
    const eventId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res = await api.sendInstantPhoto({
        photoData: selectedBase64 || selectedImageUri!,
        caption: caption.trim() || undefined,
        eventId,
      });

      const newPhoto = res?.photo || {
        id: res?.photoId || eventId,
        photoUrl: res?.photoUrl || selectedImageUri,
        caption: caption.trim(),
        deliveryStatus: res?.deliveryStatus || (partnerOnline ? 'DELIVERED' : 'SENT'),
        createdAt: new Date().toISOString(),
        isFromPartner: false,
      };

      setPhotos((prev) => [newPhoto, ...prev]);
      setSelectedImageUri(null);
      setSelectedBase64(null);
      setCaption('');

      if (res?.deliveryStatus === 'DELIVERED') {
        Alert.alert('Delivered! 📸', `Photo delivered to ${partner?.nickname || 'your partner'}!`);
      } else {
        Alert.alert(
          'Sent! 💌',
          `${partner?.nickname || 'Your partner'} is currently offline. The photo will arrive as soon as they reconnect.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send photo.');
    } finally {
      setSending(false);
      setDeliveryStatus('IDLE');
    }
  };

  // Save/Share received photo to local device
  const handleSaveToDevice = async (photoUrl: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(photoUrl);
      } else {
        Alert.alert('Sharing unavailable', 'Saving is not supported on this device.');
      }
    } catch {
      Alert.alert('Save Failed', 'Unable to save or share photo.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Our Photos</Text>
          <Text style={styles.subtitle}>
            With {partner?.nickname || 'Partner'} • {partnerOnline ? 'Online now' : 'Offline'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ACTION BUTTONS: CAMERA OR GALLERY */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={styles.captureBtn}
            activeOpacity={0.88}
            onPress={handleLaunchCamera}
          >
            <Camera size={24} color="#FFF8F5" />
            <Text style={styles.captureBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, { backgroundColor: 'rgba(217, 183, 126, 0.2)', borderWidth: 1, borderColor: 'rgba(217, 183, 126, 0.4)' }]}
            activeOpacity={0.88}
            onPress={handlePickFromGallery}
          >
            <ImageIcon size={24} color={theme.colors.gold} />
            <Text style={[styles.captureBtnText, { color: theme.colors.gold }]}>Photo Library</Text>
          </TouchableOpacity>
        </View>

        {/* PHOTO PREVIEW & SEND CARD (When photo is selected) */}
        {selectedImageUri && (
          <View style={styles.previewCard}>
            <View style={styles.previewImageWrapper}>
              <Image source={{ uri: selectedImageUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.cancelPreviewBtn}
                onPress={() => {
                  setSelectedImageUri(null);
                  setSelectedBase64(null);
                }}
              >
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.captionRow}>
              <Input
                value={caption}
                onChangeText={setCaption}
                placeholder="Write a sweet caption..."
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)' }}
              />
              <TouchableOpacity
                style={styles.sendPhotoBtn}
                onPress={handleSendPhoto}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PHOTO GALLERY SECTION */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Shared Moments</Text>
          <Text style={styles.photoCountText}>{photos.length} photos</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 30 }} />
        ) : photos.length === 0 ? (
          <View style={styles.emptyBox}>
            <ImageIcon size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No photos shared yet</Text>
            <Text style={styles.emptySub}>
              Tap "Take Photo" to share an intimate glimpse of your day!
            </Text>
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((item, index) => (
              <TouchableOpacity
                key={item.id || index}
                style={styles.photoCard}
                activeOpacity={0.88}
                onPress={() => setFullViewPhoto(item)}
              >
                <Image
                  source={{ uri: resolveMediaUrl(item.photoUrl) }}
                  style={styles.photoThumb}
                  resizeMode="cover"
                />
                <View style={styles.photoOverlay}>
                  <View style={styles.statusPill}>
                    {item.deliveryStatus === 'SEEN' ? (
                      <CheckCheck size={14} color={theme.colors.primary} />
                    ) : item.deliveryStatus === 'DELIVERED' ? (
                      <CheckCheck size={14} color="#FFF" />
                    ) : (
                      <Clock size={14} color={theme.colors.textMuted} />
                    )}
                    <Text style={styles.statusText}>{item.deliveryStatus || 'Sent'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FULL VIEW MODAL */}
      <Modal visible={Boolean(fullViewPhoto)} transparent animationType="fade">
        <View style={styles.fullViewBackdrop}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.fullViewHeader}>
              <TouchableOpacity onPress={() => setFullViewPhoto(null)} style={styles.modalCloseBtn}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
              {fullViewPhoto?.photoUrl && (
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => handleSaveToDevice(fullViewPhoto.photoUrl)}
                >
                  <Download size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.fullViewBody}>
              {fullViewPhoto?.photoUrl && (
                <Image
                  source={{ uri: resolveMediaUrl(fullViewPhoto.photoUrl) }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
              {fullViewPhoto?.caption ? (
                <Text style={styles.fullCaption}>{fullViewPhoto.caption}</Text>
              ) : null}
            </View>
          </SafeAreaView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  captureRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 18,
  },
  captureBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF8F5',
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.3)',
    marginBottom: 24,
  },
  previewImageWrapper: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cancelPreviewBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 16,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sendPhotoBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  photoCountText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  fullViewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  fullViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalCloseBtn: {
    padding: 8,
  },
  downloadBtn: {
    padding: 8,
  },
  fullViewBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullImage: {
    width: '100%',
    height: '80%',
    borderRadius: 18,
  },
  fullCaption: {
    color: '#FFF',
    fontSize: 15,
    marginTop: 14,
    textAlign: 'center',
  },
});
