import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import HomeScreen from './screens/HomeScreen';  // Make sure HomeScreen is correct
import { store } from './redux/store';
import { SocketProvider } from './context/SocketContext';
import start from './screens/start';
import MoneyPage from './screens/MoneyPage';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider>
        <SocketProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <NavigationContainer>
                <Stack.Navigator>
                  <Stack.Screen name="Home" component={HomeScreen} />
                  <Stack.Screen name="start" component={start} />
                  <Stack.Screen name="collect_money" component={MoneyPage} />
                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </SocketProvider>
      </PaperProvider>
    </Provider>
  );
}
