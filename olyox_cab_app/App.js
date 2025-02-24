import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { store } from './redux/store';
import { SocketProvider } from './context/SocketContext';
import start from './screens/start';
import MoneyPage from './screens/MoneyPage';
import OnboardingScreen from './screens/onboarding/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { name as appName } from './app.json';
import { ActivityIndicator, View, AppRegistry } from 'react-native';
import Home_Parcel from './Parcel_Partner_Screens/Home_Parcel/Home_Parcel';
import OngoingOrderScreen from './Parcel_Partner_Screens/Other_Parcel_Screens/Ongoing/OngoingOrderScreen';
import { LocationProvider } from './Parcel_Partner_Screens/Other_Parcel_Screens/Ongoing/LocationContext';
import All_Orders from './Parcel_Partner_Screens/All_Orders/All_Orders';
import OrderDetails from './Parcel_Partner_Screens/All_Orders/OrderDetails';
import RegistrationForm from './screens/onboarding/registration/RegistrationForm';
import Document from './screens/onboarding/registration/Document';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://86a3fc722120044245c28356f337118f@o4508835629694976.ingest.us.sentry.io/4508835630809088',
  enableInExpoDevelopment: true,
  debug: false,
  tracesSampleRate: 1.0,
});

const Stack = createNativeStackNavigator();

const App = () => {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageUpload, setImageUpload] = useState(true);

  const checkAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token_partner');
      console.log('Auth Token:', token);

      if (!token) {
        setUserType(null);
        setLoading(false);
        return;
      }

      const response = await axios.get(
        'http://192.168.1.10:3000/api/v1/parcel/user-details',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('User Data:', response.data.partner);

      setImageUpload(response?.data?.partner?.isDocumentUpload || false);
      setUserType(response?.data?.partner?.type || '');

    } catch (error) {
      console.error('Error fetching user details:', error?.response?.data?.message || error.message);
      setUserType(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthToken();

    const intervalId = setInterval(checkAuthToken, 20000); // Check every 20 seconds

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!imageUpload) {
    return <Document />;
  }

  return (
    <Provider store={store}>
      <PaperProvider>
        <SocketProvider>
          <LocationProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <NavigationContainer>
                  <Stack.Navigator>
                    {userType === null ? (
                      <Stack.Screen name="Home" options={{ headerShown: false }} component={OnboardingScreen} />
                    ) : userType === 'parcel' ? (
                      <Stack.Screen name="parcelHome" options={{ headerShown: false }} component={Home_Parcel} />
                    ) : userType === 'CAB' ? (
                      <Stack.Screen name="cabHome" options={{ headerShown: false }} component={start} />
                    ) : null}

                    <Stack.Screen name="Ongoing_Order" options={{ headerShown: true }} component={OngoingOrderScreen} />
                    <Stack.Screen name="All_Orders_parcel" options={{ headerShown: true, title: 'All Orders' }} component={All_Orders} />
                    <Stack.Screen name="Order_View" options={{ headerShown: true, title: 'Parcel' }} component={OrderDetails} />
                    <Stack.Screen name="start" options={{ headerShown: false }} component={start} />
                    <Stack.Screen name="collect_money" component={MoneyPage} />
                    <Stack.Screen name="register" options={{ headerShown: true, title: 'Register' }} component={RegistrationForm} />
                    <Stack.Screen name="upload_images" options={{ headerShown: true, title: 'Upload Required Documents' }} component={Document} />
                  </Stack.Navigator>
                </NavigationContainer>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </LocationProvider>
        </SocketProvider>
      </PaperProvider>
    </Provider>
  );
};

const WrappedApp = Sentry.wrap(App);

AppRegistry.registerComponent(appName, () => WrappedApp);

export default WrappedApp;
