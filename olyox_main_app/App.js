import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { useAuthRequest } from 'expo-auth-session';
import { ClerkProvider, ClerkLoaded, useClerk, useSession } from '@clerk/clerk-expo';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import * as Location from 'expo-location';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { ActivityIndicator, View, StyleSheet } from 'react-native'; // Import ActivityIndicator

import { store } from './redux/store';
import { SocketProvider } from './context/SocketContext';

// Import Screens
import HomeScreen from './screens/HomeScreen';
import Collect_Data from './Ride/First_Step_screen/Collect_Data';
import Show_Cabs from './Ride/Show_near_by_cab/Show_Cabs';
import { BookingConfirmation } from './Ride/Show_near_by_cab/confirm_booking';
import { DriverMatching } from './Ride/Show_near_by_cab/Driver_matching';
import { RideConfirmed } from './Ride/Show_near_by_cab/Ride_Confirmed';
import Hotels_details from './Hotels/Hotel_Details/Hotels_details';
import Single_Hotel_details from './Hotels/Hotel_Details/Single_Hotel_details';
import BookingSuccess from './Hotels/Hotel_Details/BookingSuccess';
import Profile from './Auth/Profile';
import { tokenCache } from './Auth/cache';
import Onboarding from './onboarding/Onboarding';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true); // Set loading to true initially

  const publishableKey = 'pk_test_c2VjdXJlLWdudS0zNi5jbGVyay5hY2NvdW50cy5kZXYk'; // Replace with environment variable in production
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gmail_token = await tokenCache.getToken('auth_token');
        const db_token = await tokenCache.getToken('auth_token_db');
        console.log(gmail_token)
        console.log(db_token)
        if (gmail_token !== null || db_token !== null) {
          setIsLogin(true);  // Both tokens are present and not null
      } else {
          setIsLogin(false); // Either one or both tokens are null
      }
      console.log(isLogin)
      } catch (error) {
        console.error('Error fetching tokens:', error);
      } finally {
        setLoading(false); // Set loading to false once fetching is done
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);

  let text = 'Waiting...';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  if (loading) {
    // Show the loader until the fetchData process is done
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PaperProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SocketProvider>
            <SafeAreaProvider>
              <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
                <ClerkLoaded>
                  <NavigationContainer>
                    <Stack.Navigator initialRouteName={isLogin ? 'Home' : 'Onboarding'}>
                      <Stack.Screen name="Home" options={{ headerShown: false }} component={HomeScreen} />
                      {/* Booking Ride Start Here */}
                      <Stack.Screen name="Start_Booking_Ride" options={{ headerShown: false }} component={Collect_Data} />
                      <Stack.Screen name="second_step_of_booking" options={{ headerShown: false }} component={Show_Cabs} />
                      <Stack.Screen name="confirm_screen" options={{ headerShown: false }} component={BookingConfirmation} />
                      <Stack.Screen name="driver_match" options={{ headerShown: false }} component={DriverMatching} />
                      <Stack.Screen name="RideStarted" options={{ headerShown: false }} component={RideConfirmed} />
                      {/* Booking Ride Start Here */}
                      <Stack.Screen name="hotels-details" options={{ headerShown: false }} component={Hotels_details} />
                      <Stack.Screen name="Single-hotels-listing" options={{ headerShown: false }} component={Single_Hotel_details} />
                      <Stack.Screen name="Booking_hotel_success" options={{ headerShown: false }} component={BookingSuccess} />
                      {/* User Profile and auth actions */}
                      {/* <Stack.Screen name="Profile" options={{ headerShown: false }} component={Profile} /> */}
                      <Stack.Screen name="Onboarding" options={{ headerShown: false }} component={Onboarding} />
                    </Stack.Navigator>
                  </NavigationContainer>
                </ClerkLoaded>
              </ClerkProvider>
            </SafeAreaProvider>
          </SocketProvider>
        </GestureHandlerRootView>
      </PaperProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
