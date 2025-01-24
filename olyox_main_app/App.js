import React, { useEffect, useState } from 'react';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import * as Location from 'expo-location';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { store } from './redux/store';
import { SocketProvider } from './context/SocketContext';
import * as Sentry from '@sentry/react-native';
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
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import { tokenCache } from './Auth/cache';
import Onboarding from './onboarding/Onboarding';
import Ride_Rating from './Ride/Show_near_by_cab/Ride_Rating';
import FloatingRide from './Ride/Floating_ride/Floating.ride';
import AllHotel from './Hotels/Hotel_Details/AllHotel';
import AllFoods from './Foods/Top_Foods/AllFoods';
import { LocationProvider } from './context/LocationContext';

const Stack = createNativeStackNavigator();
Sentry.init({
  dsn: 'https://cb37ba59c700e925974e3b36d10e8e5b@o4508691997261824.ingest.us.sentry.io/4508692015022080',
  environment: 'production',
  enableInExpoDevelopment: true,
  debug: false,
  tracesSampleRate: 1.0,
});

const App = () => {

  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const publishableKey = 'pk_test_c2VjdXJlLWdudS0zNi5jbGVyay5hY2NvdW50cy5kZXYk';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const gmail_token = await tokenCache.getToken('auth_token');
        const db_token = await tokenCache.getToken('auth_token_db');
        setIsLogin(gmail_token !== null || db_token !== null);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCurrentLocation = async () => {
    try {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      // Request background permission if foreground permission is granted
      let bgStatus = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus.status !== 'granted') {
        setErrorMsg('Background location permission denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(location);
      setErrorMsg(null); 
    } catch (error) {
      console.error('Error fetching location:', error);
      setErrorMsg('Failed to fetch location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);



  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00aaa9" />
        <Text style={styles.loadingText}>
          {errorMsg || 'Fetching your location...'}
        </Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <Button title="Retry" onPress={() => {
          setLoading(true);
          getCurrentLocation();
        }} />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PaperProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SocketProvider>
            <LocationProvider>
              <SafeAreaProvider>
                <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
                  <ClerkLoaded>
                    <NavigationContainer>
                      <Stack.Navigator initialRouteName={isLogin ? 'Home' : 'Onboarding'}>
                        <Stack.Screen name="Home" options={{ headerShown: false }} component={HomeScreen} />
                        {/* Booking Ride Screens */}
                        <Stack.Screen name="Start_Booking_Ride" options={{ headerShown: false }} component={Collect_Data} />
                        <Stack.Screen name="second_step_of_booking" options={{ headerShown: false }} component={Show_Cabs} />
                        <Stack.Screen name="confirm_screen" options={{ headerShown: false }} component={BookingConfirmation} />
                        <Stack.Screen name="driver_match" options={{ headerShown: false }} component={DriverMatching} />
                        <Stack.Screen name="RideStarted" options={{ headerShown: false }} component={RideConfirmed} />
                        <Stack.Screen name="Rate_Your_ride" options={{ headerShown: false }} component={Ride_Rating} />
                        {/* Hotel Booking Screens */}
                        <Stack.Screen name="hotels-details" options={{ headerShown: false }} component={Hotels_details} />
                        <Stack.Screen name="Hotel" options={{ headerShown: false }} component={AllHotel} />
                        <Stack.Screen name="Single-hotels-listing" options={{ headerShown: false }} component={Single_Hotel_details} />
                        <Stack.Screen name="Booking_hotel_success" options={{ headerShown: false }} component={BookingSuccess} />
                        {/* User Profile and Auth */}
                        <Stack.Screen name="Tiffin" options={{ headerShown: false }} component={AllFoods} />
                        {/* User Profile and Auth */}
                        <Stack.Screen name="Onboarding" options={{ headerShown: false }} component={Onboarding} />
                      </Stack.Navigator>
                      <FloatingRide />
                    </NavigationContainer>
                  </ClerkLoaded>
                </ClerkProvider>
              </SafeAreaProvider>
            </LocationProvider>
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


const WrappedApp = Sentry.wrap(App);
const RootApp = () => (
  <WrappedApp />
);

AppRegistry.registerComponent(appName, () => RootApp);

export default RootApp;
