import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react'; 
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/utils/colors';
import { cleanupTempFiles } from './src/utils/fileUtils';
import { AnnouncementPopup } from './src/components/AnnouncementPopup';
 
export default function App() {
  // Auto-cleanup cached downloads older than 7 days on app startup
  useEffect(() => {
    cleanupTempFiles().then((count) => {
      if (count > 0) console.log(`Cleaned ${count} old cached files`);
    }).catch(() => {});
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate
            loading={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.navy }}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            }
            persistor={persistor}
          >
            <RootNavigator />
            <AnnouncementPopup />
            <Toast />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
