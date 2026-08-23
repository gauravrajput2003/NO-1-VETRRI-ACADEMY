import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react'; 
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import Toast, { BaseToast } from 'react-native-toast-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/redux/store';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors } from './src/utils/colors';
import { cleanupTempFiles } from './src/utils/fileUtils';

const toastConfig = {
  pendingApproval: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#FCA5A5',
        backgroundColor: '#7F1D1D',
        borderLeftWidth: 6,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '700',
        color: '#FEE2E2',
      }}
      text2Style={{
        fontSize: 13,
        fontWeight: '600',
        color: '#FECACA',
      }}
    />
  ),
};

export default function App() {
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
            <Toast
              position="top"
              swipeable={true}
              visibilityTime={4000}
              autoHide={true}
              topOffset={50}
              bottomOffset={40}
              textStyle={{ fontWeight: '600' }}
              config={toastConfig}
            />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}