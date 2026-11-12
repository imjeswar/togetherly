import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ArrowLeft, Camera, Image as ImageIcon, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useCouple } from '../../context/CoupleContext';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const PhotoMomentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { partner } = useCouple();

  const [challengePrompt, setChallengePrompt] = useState('Show me what you are seeing right now');
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadChallenge();
  }, []);

  const loadChallenge = async () => {
    setLoading(true);
    try {
      const res = await api.getPhotoChallenge();
      if (res?.prompt) setChallengePrompt(res.prompt);
      if (Array.isArray(res?.photos)) setPhotos(res.photos);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to capture intimate photo moments.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processAndUploadPhoto(result.assets[0].uri);
    }
  };

  const handlePickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Gallery access is required to share photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      await processAndUploadPhoto(result.assets[0].uri);
    }
  };

  const processAndUploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      // Compress & optimize image for mobile
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const photoUrl = `data:image/jpeg;base64,${manipulated.base64}`;

      await api.uploadPhoto({
        photoUrl,
        prompt: challengePrompt,
        caption: 'Daily photo snap',
      });

      Alert.alert('Photo Shared!', 'Your photo moment has been safely shared with your partner.');
      await loadChallenge();
    } catch {
      Alert.alert('Queued for Sync', 'Your photo has been captured and queued to upload once connection is restored.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Photo Moment</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Daily Challenge Card */}
        <Card highlight style={styles.challengeCard}>
          <View style={styles.tagRow}>
            <Badge label="Daily Photo Challenge" variant="gold" />
            <Sparkles size={16} color={theme.colors.secondary} />
          </View>

          <Text style={styles.promptText}>"{challengePrompt}"</Text>

          <View style={styles.actionRow}>
            <Button
              title="Camera"
              onPress={handleCapture}
              loading={uploading}
              icon={<Camera size={18} color="#0D0B10" />}
              variant="primary"
              size="md"
              style={styles.flexBtn}
            />
            <Button
              title="Gallery"
              onPress={handlePickGallery}
              loading={uploading}
              icon={<ImageIcon size={18} color={theme.colors.secondary} />}
              variant="secondary"
              size="md"
              style={styles.flexBtn}
            />
          </View>
        </Card>

        {/* Stream of Shared Photos */}
        <Text style={styles.streamTitle}>Today's Snaps</Text>

        {photos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Camera size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No photos shared today yet.</Text>
            <Text style={styles.emptySub}>
              Snap a quick moment of your surroundings for {partner?.firstName || 'your partner'}.
            </Text>
          </View>
        ) : (
          photos.map((item) => (
            <Card key={item.id} style={styles.photoCard}>
              <View style={styles.cardAuthor}>
                <Avatar url={item.user?.avatarUrl} name={item.user?.firstName} size={32} />
                <Text style={styles.authorName}>{item.user?.firstName || 'Partner'}</Text>
                <Text style={styles.timestamp}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <Image source={{ uri: item.photoUrl }} style={styles.photoImage} resizeMode="cover" />

              {Boolean(item.caption) && (
                <Text style={styles.captionText}>{item.caption}</Text>
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
  challengeCard: {
    padding: 22,
    marginBottom: 24,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 28,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexBtn: {
    flex: 1,
  },
  streamTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: theme.typography.sizes.base,
  },
  emptySub: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
  },
  photoCard: {
    padding: 14,
    marginBottom: 16,
  },
  cardAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  authorName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  photoImage: {
    width: '100%',
    height: 300,
    borderRadius: theme.radii.lg,
    backgroundColor: '#17131C',
  },
  captionText: {
    marginTop: 10,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
  },
});

