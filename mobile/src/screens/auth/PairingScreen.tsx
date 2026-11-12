import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Heart, Share2, Copy, Sparkles, LogOut, Check, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { socketService, SocketStatus } from '../../services/socket';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FlameIcon } from '../../components/ui/FlameIcon';
import { theme } from '../../config/theme';

export const PairingScreen: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [pairingCode, setPairingCode] = useState<string>(user?.relationship?.code || '');
  const [joinCode, setJoinCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [codeLoading, setCodeLoading] = useState<boolean>(!user?.relationship?.code);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(socketService.getStatus());

  useEffect(() => {
    loadPairingCode();

    // Connect real-time socket and observe connection status
    socketService.connect(user?.relationshipId || undefined);

    const unsubStatus = socketService.onStatusChange((status) => {
      setSocketStatus(status);
    });

    // Listen to real-time pairing events
    const unsubPair = socketService.on('partner_paired', async () => {
      setSocketStatus('connected');
      await refreshUser();
    });

    const unsubJoin = socketService.on('partner:joined', async () => {
      setSocketStatus('connected');
      await refreshUser();
    });

    return () => {
      unsubStatus?.();
      unsubPair?.();
      unsubJoin?.();
    };
  }, [user?.relationshipId]);

  const loadPairingCode = async () => {
    try {
      setCodeLoading(true);
      setError('');
      const res = await api.getPairingCode();
      if (res && res.code) {
        setPairingCode(res.code);
        // Refresh auth state in background if space was newly generated
        if (!user?.relationshipId && res.relationship?.id) {
          refreshUser();
        }
      }
    } catch (err: any) {
      if (!pairingCode) {
        setError(err.message || 'Unable to retrieve invitation code. Tap reload to retry.');
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const handleShare = async () => {
    if (!pairingCode) return;
    try {
      await Share.share({
        message: `Join me on Togetherly! Enter my private sanctuary code: ${pairingCode} or open: togetherly://pair?code=${pairingCode}`,
        title: 'Join my Togetherly couple sanctuary',
      });
    } catch {}
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError('Please enter the 6-character invitation code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.joinWithCode(joinCode.trim().toUpperCase());
      if (res.success || res.relationship) {
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'Unable to join space. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const renderSocketIndicator = () => {
    switch (socketStatus) {
      case 'connecting':
        return (
          <View style={styles.waitingNotice}>
            <ActivityIndicator size="small" color={theme.colors.secondary} />
            <Text style={styles.waitingText}>Connecting to sanctuary network...</Text>
          </View>
        );
      case 'connected':
        return (
          <View style={styles.waitingNotice}>
            <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
            <Text style={styles.waitingText}>Listening for partner connection in real time...</Text>
          </View>
        );
      case 'error':
      case 'disconnected':
        return (
          <TouchableOpacity
            style={styles.waitingNotice}
            onPress={() => socketService.connect(user?.relationshipId || undefined)}
            activeOpacity={0.7}
          >
            <WifiOff size={14} color={theme.colors.error} />
            <Text style={[styles.waitingText, { color: theme.colors.error }]}>
              Network offline. Tap to reconnect
            </Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <FlameIcon size={24} />
          <Text style={styles.brandName}>Togetherly</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.banner}>
          <Text style={styles.magicQuote}>
            "Your relationship deserves little moments of magic."
          </Text>
          <Text style={styles.greeting}>
            Welcome, {user?.firstName}. Connect your couple sanctuary with your partner.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('CREATE');
              if (!pairingCode) loadPairingCode();
            }}
            style={[styles.tab, activeTab === 'CREATE' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'CREATE' && styles.tabTextActive]}>
              A. Create Space
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('JOIN')}
            style={[styles.tab, activeTab === 'JOIN' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'JOIN' && styles.tabTextActive]}>
              B. Join Space
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'CREATE' ? (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Sparkles size={24} color={theme.colors.secondary} />
              <Text style={styles.cardTitle}>Your Invitation Code</Text>
            </View>
            <Text style={styles.cardDesc}>
              Share this private code with your partner. Once they enter it, your shared sanctuary will ignite.
            </Text>

            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadPairingCode} style={styles.retryBtn}>
                  <RefreshCw size={14} color={theme.colors.primary} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.codeContainer}>
              {codeLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.colors.secondary} />
                  <Text style={styles.generatingText}>Generating unique code...</Text>
                </View>
              ) : (
                <Text style={styles.codeText}>{pairingCode || '------'}</Text>
              )}
            </View>

            <View style={styles.actionsRow}>
              <Button
                title={codeLoading ? 'Loading Code...' : 'Share Invitation'}
                onPress={handleShare}
                disabled={codeLoading || !pairingCode}
                icon={<Share2 size={18} color="#0D0B10" />}
                variant="primary"
                style={styles.flexBtn}
              />
            </View>

            {renderSocketIndicator()}
          </Card>
        ) : (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Heart size={24} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Join Partner's Space</Text>
            </View>
            <Text style={styles.cardDesc}>
              Enter the 6-character code your partner sent you to link your spaces together.
            </Text>

            {Boolean(error) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              placeholder="e.g. 8K2M9X"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
              style={styles.inputCode}
            />

            <Button
              title="Connect Sanctuary"
              onPress={handleJoin}
              loading={loading}
              variant="primary"
              size="lg"
            />
          </Card>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  logoutBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    marginTop: -20,
  },
  banner: {
    marginBottom: 24,
    alignItems: 'center',
  },
  magicQuote: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  greeting: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radii.xl,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.radii.lg,
  },
  tabActive: {
    backgroundColor: theme.colors.card,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  card: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardDesc: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  codeContainer: {
    backgroundColor: '#130E17',
    borderWidth: 2,
    borderColor: 'rgba(217, 183, 126, 0.4)',
    borderStyle: 'dashed',
    borderRadius: theme.radii.xl,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minHeight: 80,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generatingText: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.sm,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.secondary,
    letterSpacing: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
  waitingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  waitingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
  },
  inputCode: {
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  errorBox: {
    backgroundColor: theme.colors.errorMuted,
    padding: 10,
    borderRadius: theme.radii.md,
    marginBottom: 12,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.xs,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  retryBtnText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
});
