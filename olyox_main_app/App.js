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
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import Onboarding from './onboarding/Onboarding';
import Ride_Rating from './Ride/Show_near_by_cab/Ride_Rating';
import FloatingRide from './Ride/Floating_ride/Floating.ride';
import AllHotel from './Hotels/Hotel_Details/AllHotel';
import AllFoods from './Foods/Top_Foods/AllFoods';
import { LocationProvider } from './context/LocationContext';
import Food_Dispay_Page from './Foods/Food_Page/Food_Dispay_Page';
import { FoodProvider } from './context/Food_Context/Food_context';
import Restaurant from './Foods/Restaurant/Restaurant';
import Checkout from './Foods/Checkout/Checkout';
import OrderTracking from './Foods/Order_Process/Order_Process';
import MainTransport from './Transport/Main.Transport';
import Parcel_Transport from './Transport/Parcel_Transport/Parcel_Transport';
import BookParcel from './Transport/Parcel_Transport/Book-Parcel';
import Parcel_Orders from './Transport/Parcel_Transport/Parcel_orders/Parcel_Orders';
import OrderDetails from './Transport/Parcel_Transport/Parcel_orders/OrderDetails';
import { Button } from 'react-native';
import UserProfile from './screens/Profile';
import Tiffins_Page from './Foods/Tiffins_Page/Tiffins_Page';
import ErrorBoundaryWrapper from './context/ErrorBoundary';
import { tokenCache } from './Auth/cache';
import { StatusBar } from 'expo-status-bar';

const Stack = createNativeStackNavigator();
Sentry.init({
  dsn: "https://c73ead860e964d854e9985d11321815e@o4508943362621440.ingest.de.sentry.io/4508943364194384",
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

        const db_token = await tokenCache.getToken('auth_token_db');
        // console.log("DB Token", db_token)
        setIsLogin(db_token !== null);
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
      // console.log("status",status)
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      // Request background permission if foreground permission is granted
      let bgStatus = await Location.requestBackgroundPermissionsAsync();
      // console.log("bgStatus",bgStatus)

      if (bgStatus.status !== 'granted') {
        setErrorMsg('Background location permission denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      // console.log("location have me ",location)
      setLocation(location);
      setErrorMsg(null);
    } catch (error) {
      // console.error('Error fetching location:', error);
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
                    <ErrorBoundaryWrapper>

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
                          <Stack.Screen name="Tiffins_Page" options={{ headerShown: true, title: "Tiffins Package" }} component={Tiffins_Page} />
                          <Stack.Screen name="food_Page_By_Cats" options={{ headerShown: false }} component={Food_Dispay_Page} />
                          <Stack.Screen name="restaurants_page" options={{ headerShown: false }} component={Restaurant} />
                          <Stack.Screen name="Checkout" options={{ headerShown: false }} component={Checkout} />
                          <Stack.Screen name="Order_Process" options={{ headerShown: false }} component={OrderTracking} />
                          {/* User Profile and Auth */}


                          <Stack.Screen name="Profile" options={{ headerShown: true }} component={UserProfile} />
                          {/* Transport */}
                          <Stack.Screen name="Transport" options={{ headerShown: false }} component={MainTransport} />
                          <Stack.Screen name="delivery_parcel" options={{ headerShown: false }} component={Parcel_Transport} />
                          <Stack.Screen name="Book-Parcel" options={{ headerShown: false }} component={BookParcel} />
                          <Stack.Screen name="Parcel" options={{ headerShown: false }} component={Parcel_Orders} />
                          <Stack.Screen name="OrderDetails" options={{ headerShown: false }} component={OrderDetails} />
                          <Stack.Screen name="Onboarding" options={{ headerShown: false }} component={Onboarding} />
                        </Stack.Navigator>

                      </NavigationContainer>
                    </ErrorBoundaryWrapper>
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

  <FoodProvider>
    <StatusBar backgroundColor='#DA2E2A' style="light" />
    <WrappedApp />
  </FoodProvider>

);

AppRegistry.registerComponent(appName, () => RootApp);

export default RootApp;
