import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

import { store } from './redux/store';
import { SocketProvider } from './context/SocketContext';
import { LocationProvider } from './context/LocationContext';

import HomeScreen from './screens/HomeScreen';
import StartScreen from './screens/start';
import MoneyPage from './screens/MoneyPage';
import OnboardingScreen from './screens/onboarding/OnboardingScreen';
import RegistrationForm from './screens/onboarding/registration/RegistrationForm';
import Document from './screens/onboarding/registration/Document';
import Loading from './components/Loading';
import Wait_Screen from './screens/Wait_Screen/Wait_Screen';
import AllRides from './screens/All_Rides/AllRides';
import Profile from './screens/Profile/Profile';
import SupportScreen from './screens/Support/Support';

const Stack = createNativeStackNavigator();

export default function App() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDocumentUploaded, setIsDocumentUploaded] = useState(false);
  const [isDocumentVerified, setIsDocumentVerified] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Onboarding');

  useEffect(() => {
    const checkAuthToken = async () => {
      setLoading(true);
      try {
        const token = await SecureStore.getItemAsync('auth_token_cab');

        if (token) {
          const response = await axios.get(
            'https://demoapi.olyox.com/api/v1/rider/user-details',
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const partnerData = response.data.partner;
          console.log("Token:", partnerData);

          setIsDocumentUploaded(partnerData?.isDocumentUpload ?? false);
          setIsDocumentVerified(partnerData?.DocumentVerify ?? false);
          setUserType(partnerData?.type || '');
          setIsAuthenticated(true);

          // Determine initial route based on user conditions
          if (!partnerData?.isDocumentUpload) {
            setInitialRoute('UploadDocuments');
          } else if (!partnerData?.DocumentVerify) {
            setInitialRoute('Wait_Screen');
          } else {
            setInitialRoute('Home');
          }
        } else {
          setIsAuthenticated(false);
          setInitialRoute('Onboarding');
        }
      } catch (error) {
        console.error('Error fetching user details:', error.response?.data?.message);
        setIsAuthenticated(false);
        setInitialRoute('Onboarding');
      } finally {
        setLoading(false);
      }
    };

    checkAuthToken();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <Provider store={store}>
      <PaperProvider>
        <SocketProvider>
          <LocationProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <NavigationContainer>
                  <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                    <Stack.Screen name="register" component={RegistrationForm} />
                    <Stack.Screen name="UploadDocuments" component={Document} />
                    <Stack.Screen name="Wait_Screen" component={Wait_Screen} />
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen name="start" component={StartScreen} />
                    <Stack.Screen name="support" component={SupportScreen} />
                    <Stack.Screen name="collect_money" component={MoneyPage} />
                    <Stack.Screen name="AllRides" options={{ headerShown: false, title: 'All Rides' }} component={AllRides} />
                    <Stack.Screen name="Profile" options={{ headerShown: true, title: 'My Profile' }} component={Profile} />
                  </Stack.Navigator>
                </NavigationContainer>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </LocationProvider>
        </SocketProvider>
      </PaperProvider>
    </Provider>
  );
}
