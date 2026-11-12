import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { PairingScreen } from '../screens/auth/PairingScreen';
import { BiometricLockScreen } from '../screens/auth/BiometricLockScreen';
import { DailyQuestionScreen } from '../screens/connect/DailyQuestionScreen';
import { LoveNotesScreen } from '../screens/connect/LoveNotesScreen';
import { DrawingScreen } from '../screens/connect/DrawingScreen';
import { QuickDrawingScreen } from '../screens/connect/QuickDrawingScreen';
import { PhotoMomentsScreen } from '../screens/connect/PhotoMomentsScreen';
import { GamesScreen } from '../screens/games/GamesScreen';
import { SecurityScreen } from '../screens/profile/SecurityScreen';
import { DataExportScreen } from '../screens/profile/DataExportScreen';
import { DiagnosticsScreen } from '../screens/profile/DiagnosticsScreen';
import { theme } from '../config/theme';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['togetherly://', 'https://togetherly.app'],
  config: {
    screens: {
      QuickDrawing: 'canvas/quick',
      Pairing: 'pair',
      DailyQuestion: 'question',
      LoveNotes: 'love-notes',
      PhotoMoments: 'photos',
      Games: 'games',
      Security: 'security',
      Diagnostics: 'diagnostics',
    },
  },
};

export const RootNavigator: React.FC = () => {
  const { user, token, isLoading, isBiometricLocked } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isBiometricLocked) {
    return <BiometricLockScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!token ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : !user?.relationshipId || !user?.partner ? (
          <Stack.Screen name="Pairing" component={PairingScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={AppTabs} />
            <Stack.Screen name="DailyQuestion" component={DailyQuestionScreen} />
            <Stack.Screen name="LoveNotes" component={LoveNotesScreen} />
            <Stack.Screen name="Drawing" component={DrawingScreen} />
            <Stack.Screen name="QuickDrawing" component={QuickDrawingScreen} />
            <Stack.Screen name="PhotoMoments" component={PhotoMomentsScreen} />
            <Stack.Screen name="Games" component={GamesScreen} />
            <Stack.Screen name="Security" component={SecurityScreen} />
            <Stack.Screen name="DataExport" component={DataExportScreen} />
            <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

