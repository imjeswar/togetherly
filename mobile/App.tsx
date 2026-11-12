import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import { CoupleProvider } from './src/context/CoupleContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0D0B10" />
      <AuthProvider>
        <SyncProvider>
          <CoupleProvider>
            <RootNavigator />
          </CoupleProvider>
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

