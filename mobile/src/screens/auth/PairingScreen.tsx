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
  Clipboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Heart,
  Share2,
  Copy,
  Sparkles,
  Check,
  RefreshCw,
  Wifi,
  WifiOff,
  Users,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FlameIcon } from '../../components/ui/FlameIcon';
import { theme } from '../../config/theme';

export const PairingScreen: React.FC = () => {
  const {
    createSpace,
    joinSpace,
    invitationCode,
    isPaired,
    socketStatus,
    partnerOnline,
    userNickname,
  } = useAuth();

  const [activeMode, setActiveMode] = useState<'CHOICE' | 'CREATE' | 'JOIN'>('CHOICE');
  const [createdCode, setCreatedCode] = useState<string>(invitationCode || '');
  const [joinInputCode, setJoinInputCode] = useState<string>('');
  const [myNickname, setMyNickname] = useState<string>(userNickname || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (invitationCode) {
      setCreatedCode(invitationCode);
    }
  }, [invitationCode]);

  // Handle Create Space
  const handleCreateSpace = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await createSpace(myNickname.trim() || 'My Love');
      if (res?.invitationCode) {
        setCreatedCode(res.invitationCode);
        setActiveMode('CREATE');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to create space. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Join Space
  const handleJoinSpace = async () => {
    const code = joinInputCode.trim().toUpperCase();
    if (code.length < 6) {
      setError('Please enter the complete 6-character code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await joinSpace(code, myNickname.trim() || 'My Darling');
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please check the invitation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdCode) return;
    Clipboard.setString(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!createdCode) return;
    try {
      await Share.share({
        message: `Join me on Togetherly! Enter my private sanctuary code: ${createdCode}\nDownload or open: https://togetherly-ruby-pi.vercel.app`,
        title: 'Join my Togetherly couple space',
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand */}
          <View style={styles.header}>
            <View style={styles.flameContainer}>
              <FlameIcon size={38} color={theme.colors.primary} />
            </View>
            <Text style={styles.appName}>Togetherly</Text>
            <Text style={styles.headline}>Your little space, just for two.</Text>
            <Text style={styles.subheadline}>
              A private, distraction-free sanctuary for instant drawing and photo sharing.
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* MODE 1: CHOICE SCREEN */}
          {activeMode === 'CHOICE' && (
            <View style={styles.choiceSection}>
              {/* Nickname input */}
              <View style={styles.nicknameBox}>
                <Text style={styles.inputLabel}>Your Nickname</Text>
                <Input
                  value={myNickname}
                  onChangeText={setMyNickname}
                  placeholder="e.g. Alex, Honey, Darling..."
                  style={styles.nicknameInput}
                />
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={handleCreateSpace}
                disabled={loading}
                activeOpacity={0.88}
              >
                <View style={styles.actionIconBox}>
                  <Sparkles size={22} color="#FFF8F5" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.actionBtnTitle}>1. Create Your Space</Text>
                  <Text style={styles.actionBtnSubtitle}>
                    Get a 6-character private invite code for your partner
                  </Text>
                </View>
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <ArrowRight size={20} color="rgba(255,255,255,0.7)" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={() => {
                  setError('');
                  setActiveMode('JOIN');
                }}
                activeOpacity={0.88}
              >
                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(217, 183, 126, 0.2)' }]}>
                  <Users size={22} color={theme.colors.gold} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.actionBtnTitle, { color: theme.colors.gold }]}>
                    2. Join Your Partner
                  </Text>
                  <Text style={styles.actionBtnSubtitle}>
                    Enter the code shared by your partner to connect instantly
                  </Text>
                </View>
                <ArrowRight size={20} color={theme.colors.gold} />
              </TouchableOpacity>

              <View style={styles.securityPill}>
                <ShieldCheck size={16} color={theme.colors.textMuted} />
                <Text style={styles.securityText}>
                  Anonymous & device-bound. No password or email needed.
                </Text>
              </View>
            </View>
          )}

          {/* MODE 2: DISPLAY CREATED CODE & WAIT */}
          {activeMode === 'CREATE' && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Sparkles size={24} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Your Invitation Code</Text>
              </View>
              <Text style={styles.cardDescription}>
                Share this private code with your partner. Once they enter it, your shared sanctuary will ignite.
              </Text>

              {/* Code Display Box */}
              <View style={styles.codeContainer}>
                {createdCode ? (
                  <View style={styles.codeBoxesRow}>
                    {createdCode.split('').map((char, index) => (
                      <View key={index} style={styles.singleCharBox}>
                        <Text style={styles.singleCharText}>{char}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                )}
              </View>

              {/* Copy & Share Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.outlineButton, copied && styles.copiedOutline]}
                  onPress={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check size={18} color={theme.colors.success} />
                      <Text style={[styles.outlineBtnText, { color: theme.colors.success }]}>
                        Copied!
                      </Text>
                    </>
                  ) : (
                    <>
                      <Copy size={18} color={theme.colors.primary} />
                      <Text style={styles.outlineBtnText}>Copy Code</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Share2 size={18} color="#FFF8F5" />
                  <Text style={styles.shareBtnText}>Share Invitation</Text>
                </TouchableOpacity>
              </View>

              {/* Real-time status indicator */}
              <View style={styles.listeningBox}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.listeningText}>
                  {partnerOnline
                    ? 'Partner connected! Entering sanctuary...'
                    : 'Listening for partner connection in real time...'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => setActiveMode('CHOICE')}
              >
                <Text style={styles.backLinkText}>Switch or enter a code instead</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* MODE 3: JOIN USING CODE */}
          {activeMode === 'JOIN' && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Heart size={24} color={theme.colors.gold} />
                <Text style={[styles.cardTitle, { color: theme.colors.gold }]}>
                  Join Your Partner
                </Text>
              </View>
              <Text style={styles.cardDescription}>
                Enter the 6-character code your partner sent you to link your two devices.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Invitation Code</Text>
                <Input
                  value={joinInputCode}
                  onChangeText={(val) => setJoinInputCode(val.toUpperCase())}
                  placeholder="e.g. K9W4MZ"
                  autoCapitalize="characters"
                  maxLength={6}
                  style={styles.codeInputField}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Nickname (Optional)</Text>
                <Input
                  value={myNickname}
                  onChangeText={setMyNickname}
                  placeholder="e.g. My Darling"
                />
              </View>

              <Button
                title={loading ? 'Connecting...' : 'Connect to Sanctuary'}
                onPress={handleJoinSpace}
                disabled={loading || joinInputCode.trim().length < 6}
                style={{ marginTop: 12 }}
              />

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => setActiveMode('CHOICE')}
              >
                <Text style={styles.backLinkText}>Back to options</Text>
              </TouchableOpacity>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 48,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  flameContainer: {
    marginBottom: 12,
  },
  appName: {
    fontFamily: theme.fonts.heading,
    fontSize: 28,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headline: {
    fontFamily: theme.fonts.heading,
    fontSize: 22,
    color: theme.colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  subheadline: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
    lineHeight: 18,
  },
  errorBanner: {
    width: '100%',
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 20,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
  },
  choiceSection: {
    width: '100%',
  },
  nicknameBox: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nicknameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 160, 168, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.35)',
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 183, 126, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 183, 126, 0.3)',
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  actionBtnSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
  },
  securityText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  card: {
    width: '100%',
    padding: 22,
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  codeContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 160, 168, 0.4)',
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  codeBoxesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  singleCharBox: {
    width: 40,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 160, 168, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleCharText: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  copiedOutline: {
    borderColor: theme.colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  shareButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF8F5',
  },
  listeningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  listeningText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  inputGroup: {
    marginBottom: 16,
  },
  codeInputField: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  backLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 13,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
