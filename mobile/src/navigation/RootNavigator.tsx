import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { PairingScreen } from '../screens/auth/PairingScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { DrawingScreen } from '../screens/connect/DrawingScreen';
import { QuickDrawingScreen } from '../screens/connect/QuickDrawingScreen';
import { PhotoMomentsScreen } from '../screens/connect/PhotoMomentsScreen';
import { theme } from '../config/theme';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['togetherly://', 'https://togetherly.app', 'https://togetherly-ruby-pi.vercel.app'],
  config: {
    screens: {
      Pairing: 'pair',
      Home: {
        path: 'home',
        exact: true,
      },
      QuickDrawing: {
        path: 'draw/quick',
        alias: ['canvas/quick', 'quick-draw'],
      },
      Drawing: {
        path: 'draw/shared',
        alias: ['canvas/shared', 'drawing', 'canvas'],
      },
      PhotoMoments: {
        path: 'photos',
        alias: ['photo', 'moments'],
      },
    },
  },
};

export const RootNavigator: React.FC = () => {
  const { isPaired, isLoading, token } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!token || !isPaired ? (
          <Stack.Screen name="Pairing" component={PairingScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="QuickDrawing" component={QuickDrawingScreen} />
            <Stack.Screen name="Drawing" component={DrawingScreen} />
            <Stack.Screen name="PhotoMoments" component={PhotoMomentsScreen} />
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
