import React, { useState, useEffect } from 'react';
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
import OnboardingScreen from './screens/onboarding/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ActivityIndicator, View } from 'react-native';  // Import ActivityIndicator
import Home_Parcel from './Parcel_Partner_Screens/Home_Parcel/Home_Parcel';

const Stack = createNativeStackNavigator();

export default function App() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthToken = async () => {
      const token = await AsyncStorage.getItem('auth_token_partner');
      // console.log("token", token);
      if (token) {
        try {
          const response = await axios.get(
            'http://192.168.1.9:9630/api/v1/parcel/user-details',  // Replace with your API endpoint
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          console.log(response.data.partner);
          // Assuming the API responds with user data and a userType
          setUserType(response?.data?.partner?.type || '');  // Set the user type from the API response
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      } else {
        setUserType(null);  // If no token, set userType as null
      }
      setLoading(false);  // Done loading
    };

    checkAuthToken();
  }, []);

  if (loading) {
    // Show loading screen while waiting for API response
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PaperProvider>
        <SocketProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <NavigationContainer>
                <Stack.Navigator>
                  {/* <Stack.Screen name="Home" component={HomeScreen} /> */}
                  {userType === null ? (
                    <Stack.Screen name="Home" options={{ headerShown: false }} component={OnboardingScreen} />
                  ) : userType === 'parcel' ? (
                    <Stack.Screen name="parcelHome" options={{ headerShown: false }} component={Home_Parcel} />
                  ) : userType === 'CAB' ? (
                    <Stack.Screen name="cabHome" options={{ headerShown: false }} component={start} />
                  ) : null}
                  <Stack.Screen name="start" options={{ headerShown: false }} component={start} />
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
