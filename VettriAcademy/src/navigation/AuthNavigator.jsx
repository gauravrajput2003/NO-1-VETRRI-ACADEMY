import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkspaceSelectionScreen from '../screens/auth/WorkspaceSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleSelect">
        {(props) => (
          <WorkspaceSelectionScreen
            onSelectWorkspace={(role) =>
              props.navigation.navigate('Login', { role })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
