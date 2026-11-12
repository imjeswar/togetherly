import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Activity,
  Wifi,
  Database,
  ShieldCheck,
  Fingerprint,
  Layers,
  Bell,
  RefreshCw,
  Play,
} from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { useSync } from '../../context/SyncContext';
import { useCouple } from '../../context/CoupleContext';
import { offlineStorage } from '../../services/offlineStorage';
import { e2eeService } from '../../services/e2ee';
import { biometricService, BiometricCheckResult } from '../../services/biometric';
import { widgetBridge } from '../../services/widgetBridge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { theme } from '../../config/theme';

export const DiagnosticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isOnline, pendingCount, triggerSync } = useSync();
  const { dashboard } = useCouple();

  // Diagnostics State
  const [netState, setNetState] = useState<any>(null);
  const [cachedCounts, setCachedCounts] = useState({
    questions: 0,
    memories: 0,
    drawings: 0,
    loveNotes: 0,
  });
  const [biometricInfo, setBiometricInfo] = useState<BiometricCheckResult | null>(null);
  const [e2eeBenchmark, setE2eeBenchmark] = useState<{
    publicKey: string;
    plaintext: string;
    ciphertext: string;
    nonce: string;
    decrypted: string;
    durationMs: number;
    success: boolean;
  } | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [widgetPayload, setWidgetPayload] = useState<any>(null);

  useEffect(() => {
    runAllDiagnostics();
  }, []);

  const runAllDiagnostics = async () => {
    // 1. NetInfo
    const state = await NetInfo.fetch();
    setNetState(state);

    // 2. SQLite Cache Counts
    try {
      const q = await offlineStorage.getCachedQuestions();
      const m = await offlineStorage.getCachedMemories();
      const d = await offlineStorage.getCachedDrawings();
      const l = await offlineStorage.getCachedLoveNotes();
      setCachedCounts({
        questions: q.length,
        memories: m.length,
        drawings: d.length,
        loveNotes: l.length,
      });
    } catch {}

    // 3. Biometrics
    const bio = await biometricService.checkAvailability();
    setBiometricInfo(bio);

    // 4. Widget Bridge
    const wData = await widgetBridge.getWidgetData();
    setWidgetPayload(wData);
  };

  const runE2EEBenchmark = async () => {
    setBenchmarking(true);
    const start = Date.now();
    try {
      const testString = 'Intimate secret: "You are my favorite forever." ❤️';
      const keyPair = await e2eeService.getOrCreateKeyPair();

      // Encrypt
      const encrypted = await e2eeService.encrypt(testString);

      // Decrypt
      const decrypted = await e2eeService.decrypt(
        encrypted.encryptedPayload,
        encrypted.nonce
      );

      const durationMs = Date.now() - start;

      setE2eeBenchmark({
        publicKey: keyPair.publicKey.substring(0, 24) + '...',
        plaintext: testString,
        ciphertext: encrypted.encryptedPayload.substring(0, 32) + '...',
        nonce: encrypted.nonce,
        decrypted,
        durationMs,
        success: decrypted === testString,
      });
    } catch (err: any) {
      Alert.alert('Benchmark Error', err.message);
    } finally {
      setBenchmarking(false);
    }
  };

  const handleTestBiometricPrompt = async () => {
    const success = await biometricService.authenticate('Diagnostics verification test');
    Alert.alert(
      success ? 'Biometric Verified! ✅' : 'Authentication Cancelled / Failed ❌',
      success
        ? 'Your hardware sensor successfully confirmed your intimate sanctuary identity.'
        : 'The biometric check did not succeed or was cancelled.'
    );
  };

  const handleBroadcastWidgetUpdate = async () => {
    if (dashboard) {
      const updated = await widgetBridge.updateWidgetData(dashboard);
      setWidgetPayload(updated);
      Alert.alert('Widget Broadcasted', 'Updated shared payload for Android & iOS widgets.');
    } else {
      Alert.alert('Notice', 'Load dashboard data first to broadcast.');
    }
  };

  const handleTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Togetherly Moment',
          body: 'Your partner left an intimate note for you.',
          data: { screen: 'love-notes', isPrivate: true },
        },
        trigger: null, // immediate
      });
      Alert.alert('Notification Dispatched', 'Check your device notification shade.');
    } catch {
      Alert.alert('Notification Notice', 'Notifications not configured for this device environment.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Activity size={18} color={theme.colors.secondary} />
          <Text style={styles.barTitle}>QA & System Diagnostics</Text>
        </View>
        <TouchableOpacity onPress={runAllDiagnostics} style={styles.backBtn}>
          <RefreshCw size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Network & Connectivity */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Wifi size={18} color={isOnline ? theme.colors.success : theme.colors.error} />
            <Text style={styles.cardTitle}>Network & Sync Engine</Text>
            <Badge
              label={isOnline ? 'Online' : 'Offline'}
              variant={isOnline ? 'success' : 'rose'}
              style={{ marginLeft: 'auto' }}
            />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connection Type:</Text>
            <Text style={styles.infoVal}>{netState?.type || 'unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Internet Reachable:</Text>
            <Text style={styles.infoVal}>{String(netState?.isInternetReachable ?? false)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending Sync Operations:</Text>
            <Text style={[styles.infoVal, { color: pendingCount > 0 ? theme.colors.secondary : theme.colors.textPrimary }]}>
              {pendingCount} items
            </Text>
          </View>
          <Button
            title="Trigger Sync Queue Replay"
            onPress={triggerSync}
            variant="outline"
            size="sm"
            style={{ marginTop: 10 }}
          />
        </Card>

        {/* SQLite Local Tables */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Database size={18} color={theme.colors.secondary} />
            <Text style={styles.cardTitle}>On-Device SQLite Persistence</Text>
          </View>
          <View style={styles.grid2x2}>
            <View style={styles.gridBox}>
              <Text style={styles.gridNum}>{cachedCounts.questions}</Text>
              <Text style={styles.gridLbl}>Cached Questions</Text>
            </View>
            <View style={styles.gridBox}>
              <Text style={styles.gridNum}>{cachedCounts.memories}</Text>
              <Text style={styles.gridLbl}>Cached Memories</Text>
            </View>
            <View style={styles.gridBox}>
              <Text style={styles.gridNum}>{cachedCounts.drawings}</Text>
              <Text style={styles.gridLbl}>Offline Drawings</Text>
            </View>
            <View style={styles.gridBox}>
              <Text style={styles.gridNum}>{cachedCounts.loveNotes}</Text>
              <Text style={styles.gridLbl}>Offline Notes</Text>
            </View>
          </View>
        </Card>

        {/* Genuine E2EE Benchmark */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Genuine E2EE Crypto Benchmark</Text>
          </View>
          <Text style={styles.descText}>
            Tests hardware AES-256-GCM encryption & ECDH shared key derivation in real time.
          </Text>

          {e2eeBenchmark && (
            <View style={styles.benchResult}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Device Public Key:</Text>
                <Text style={styles.codeVal}>{e2eeBenchmark.publicKey}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Encrypted Ciphertext:</Text>
                <Text style={styles.codeVal}>{e2eeBenchmark.ciphertext}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Decrypted Integrity:</Text>
                <Text style={{ color: theme.colors.success, fontWeight: '700' }}>
                  {e2eeBenchmark.success ? '100% Match' : 'Mismatch'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Roundtrip Latency:</Text>
                <Text style={styles.infoVal}>{e2eeBenchmark.durationMs} ms</Text>
              </View>
            </View>
          )}

          <Button
            title="Run Live E2EE Benchmark"
            onPress={runE2EEBenchmark}
            loading={benchmarking}
            icon={<Play size={14} color="#0D0B10" />}
            variant="primary"
            size="sm"
            style={{ marginTop: 10 }}
          />
        </Card>

        {/* Biometrics */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Fingerprint size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Biometric Hardware Sensor</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hardware Present:</Text>
            <Text style={styles.infoVal}>{String(biometricInfo?.hasHardware ?? false)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Biometrics Enrolled:</Text>
            <Text style={styles.infoVal}>{String(biometricInfo?.isEnrolled ?? false)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sensor Modality:</Text>
            <Text style={styles.infoVal}>{biometricInfo?.biometricType || 'NONE'}</Text>
          </View>
          <Button
            title="Trigger Biometric Challenge"
            onPress={handleTestBiometricPrompt}
            variant="secondary"
            size="sm"
            style={{ marginTop: 10 }}
          />
        </Card>

        {/* Widgets Bridge */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Layers size={18} color={theme.colors.secondary} />
            <Text style={styles.cardTitle}>Home-Screen Widget Bridge</Text>
          </View>
          <Text style={styles.descText}>
            Payload exported for Android RemoteViews & iOS AppGroup WidgetKit:
          </Text>
          <View style={styles.jsonBox}>
            <Text style={styles.codeVal}>
              {widgetPayload
                ? JSON.stringify(
                    {
                      daysTogether: widgetPayload.daysTogether,
                      streakCount: widgetPayload.streakCount,
                      partner: widgetPayload.partnerName,
                      dailyQuestion: widgetPayload.dailyQuestionText?.substring(0, 30) + '...',
                    },
                    null,
                    2
                  )
                : 'No widget payload generated yet.'}
            </Text>
          </View>
          <Button
            title="Broadcast Widget Update"
            onPress={handleBroadcastWidgetUpdate}
            variant="outline"
            size="sm"
          />
        </Card>

        {/* Push Notification Test */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Bell size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Push Notification Simulation</Text>
          </View>
          <Button
            title="Dispatch Test Notification"
            onPress={handleTestNotification}
            variant="secondary"
            size="sm"
            style={{ marginTop: 6 }}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  descText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textSecondary,
  },
  infoVal: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  codeVal: {
    fontSize: 11,
    color: theme.colors.primary,
    fontFamily: 'monospace',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridBox: {
    width: '48%',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radii.lg,
    padding: 12,
    alignItems: 'center',
  },
  gridNum: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  gridLbl: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  benchResult: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radii.lg,
    padding: 12,
    marginBottom: 6,
  },
  jsonBox: {
    backgroundColor: '#130E17',
    borderRadius: theme.radii.md,
    padding: 10,
    marginBottom: 10,
  },
});

