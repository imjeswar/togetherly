import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, Download, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { theme } from '../../config/theme';

export const DataExportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const jsonString = JSON.stringify(data, null, 2);

      // Save to temporary file and share
      const fileUri = `${FileSystem.cacheDirectory}togetherly-export-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Togetherly Sanctuary Data',
        });
      } else {
        await Share.share({
          message: jsonString,
          title: 'Togetherly Data Export',
        });
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export your data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Sanctuary Account?',
      'This will permanently delete your profile, relationship workspace, memories, love notes, and drawings. This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount();
      Alert.alert('Account Deleted', 'Your data and account have been permanently erased.');
      await logout();
    } catch (err: any) {
      Alert.alert('Deletion Error', err.message || 'Unable to delete account right now.');
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.barTitle}>Privacy & Data Rights</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Export Data */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Download size={22} color={theme.colors.secondary} />
            <Text style={styles.cardTitle}>Export Your Couple Data</Text>
          </View>
          <Text style={styles.cardDesc}>
            Download an encrypted, full JSON archive containing all your questions, answers, love notes, memories, and photos.
          </Text>
          <Button
            title="Download Full Archive"
            onPress={handleExportData}
            loading={exporting}
            variant="secondary"
            size="md"
          />
        </Card>

        {/* Delete Account */}
        <Card style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={22} color={theme.colors.error} />
            <Text style={[styles.cardTitle, { color: theme.colors.error }]}>
              Delete Sanctuary & Account
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            Permanently erase all personal data, relationship history, photos, and messages. Both you and your partner will be unlinked.
          </Text>
          <Button
            title="Delete Account Permanently"
            onPress={handleDeleteAccount}
            loading={deleting}
            variant="danger"
            size="md"
          />
        </Card>
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
    gap: 18,
  },
  card: {
    padding: 22,
  },
  dangerCard: {
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardDesc: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
});

