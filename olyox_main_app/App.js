import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import * as Location from 'expo-location';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { ActivityIndicator, View, Text, StyleSheet, Linking, Image, TouchableOpacity, Platform } from 'react-native';
import { store } from './redux/store';
import { SocketProvider } from './context/SocketContext';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import * as IntentLauncher from 'expo-intent-launcher';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';

// Import screens
import HomeScreen from './screens/HomeScreen';
import Collect_Data from './Ride/First_Step_screen/Collect_Data';
import Show_Cabs from './Ride/Show_near_by_cab/Show_Cabs';
import { DriverMatching } from './Ride/Show_near_by_cab/Driver_matching';
import { RideConfirmed } from './Ride/Show_near_by_cab/Ride_Confirmed';
import Hotels_details from './Hotels/Hotel_Details/Hotels_details';
import Single_Hotel_details from './Hotels/Hotel_Details/Single_Hotel_details';
import BookingSuccess from './Hotels/Hotel_Details/BookingSuccess';
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
import UserProfile from './screens/Profile';
import Tiffins_Page from './Foods/Tiffins_Page/Tiffins_Page';
import ErrorBoundaryWrapper from './context/ErrorBoundary';
import { tokenCache } from './Auth/cache';
import BookingConfirmation from './Ride/Show_near_by_cab/confirm_booking';

const Stack = createNativeStackNavigator();

// Initialize Sentry
Sentry.init({
  dsn: "https://c73ead860e964d854e9985d11321815e@o4508943362621440.ingest.de.sentry.io/4508943364194384",
  enableInExpoDevelopment: true,
  debug: false,
  tracesSampleRate: 1.0,
});

// Define location error types
const ERROR_TYPES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
};

const App = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [locationFetchRetries, setLocationFetchRetries] = useState(0);

  // Check login status
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const db_token = await tokenCache.getToken('auth_token_db');
        setIsLogin(db_token !== null);
      } catch (error) {
        console.error('Error fetching tokens:', error);
        Sentry.captureException(error);
      }
    };

    checkLoginStatus();
  }, []);

  // Open device settings
  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
        );
      }
    } catch (error) {
      console.error('Error opening settings:', error);
      Sentry.captureException(error);
    }
  }, []);

  // Get high accuracy location
  const getHighAccuracyLocation = useCallback(async () => {
    let watchSubscription = null;
    try {
      setLoading(true);

      // Step 1: Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      console.log("🔍 Location services enabled:", isLocationEnabled);
      if (!isLocationEnabled) {
        setErrorType(ERROR_TYPES.LOCATION_UNAVAILABLE);
        setLoading(false);
        return;
      }

      // Step 2: Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("🔐 Location permission status:", status);

      if (status !== 'granted') {
        setErrorType(ERROR_TYPES.PERMISSION_DENIED);
        setLoading(false);
        return;
      }

      // Step 3: Get high accuracy location with timeout handling
      try {
        const currentLocation = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            maximumAge: 1000,
            mayShowUserSettingsDialog: true,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Location request timed out')), 600000) // 10 sec timeout
          )
        ]);

        console.log("📍 Got initial location:", currentLocation);
        setLocation(currentLocation);
        setErrorType(null);
        setLocationFetchRetries(0);

        // Step 4: Start watching position for better updates
        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 10000,
            distanceInterval: 1, // meters
          },
          (newLocation) => {
            console.log("📡 Location update:", newLocation);
            setLocation(newLocation);
          }
        );

      } catch (error) {
        console.error('❌ Error getting high accuracy location:', error);

        if (error.message && error.message.includes('timeout')) {
          setErrorType(ERROR_TYPES.TIMEOUT);
        } else {
          setErrorType(ERROR_TYPES.UNKNOWN);
        }

        setLocationFetchRetries(prev => prev + 1);
      }

    } catch (error) {
      console.error('❗ Error in location service:', error);
      Sentry?.captureException?.(error);
      setErrorType(ERROR_TYPES.UNKNOWN);

    } finally {
      setLoading(false);
    }

    return () => {
      // Cleanup location watcher when component unmounts
      if (watchSubscription) {
        watchSubscription.remove();
        console.log("🧹 Cleaned up location watcher.");
      }
    };
  }, [locationFetchRetries]);

  // Initial location fetch
  useEffect(() => {
    getHighAccuracyLocation();
  }, [getHighAccuracyLocation]);

  // Auto-retry location fetch up to 3 times
  useEffect(() => {
    if ((errorType === ERROR_TYPES.TIMEOUT || errorType === ERROR_TYPES.UNKNOWN) &&
      locationFetchRetries <= 3) {
      const retryDelay = locationFetchRetries * 2000; // 2s, 4s, 6s
      const retryTimer = setTimeout(() => {
        getHighAccuracyLocation();
      }, retryDelay);

      return () => clearTimeout(retryTimer);
    }
  }, [errorType, locationFetchRetries, getHighAccuracyLocation]);

  // Helper function to render all routes
  const renderRoutes = () => (
    <>
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
      {/* Food Screens */}
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
    </>
  );

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#00aaa9" />
        <Text style={styles.loadingText}>Fetching your location...</Text>
      </View>
    );
  }

  // Error screen with action button to fix
  if (errorType) {
    let errorMessage = '';
    let buttonText = '';
    let buttonAction = getHighAccuracyLocation;
    let iconSource = `https://res.cloudinary.com/dglihfwse/image/upload/v1744271215/pin_zpnnjn.png`;

    switch (errorType) {
      case ERROR_TYPES.PERMISSION_DENIED:
        errorMessage = 'Location access is required to use this app. Please grant location permissions.';
        buttonText = 'Open Settings';
        buttonAction = openSettings;
        break;

      case ERROR_TYPES.LOCATION_UNAVAILABLE:
        errorMessage = 'Location services are disabled on your device. Please enable location services.';
        buttonText = 'Open Settings';
        buttonAction = openSettings;
        break;

      case ERROR_TYPES.TIMEOUT:
        errorMessage = 'Could not get your location in time. Please check your connection and try again.';
        buttonText = 'Try Again';
        break;

      default:
        errorMessage = 'There was a problem determining your location. Please try again.';
        buttonText = 'Try Again';
    }

    return (
      <View style={styles.errorContainer}>
        <StatusBar style="auto" />
        <Image
          source={{ uri: iconSource }}
          style={styles.errorIcon}
          resizeMode="contain"
        />
        <Text style={styles.errorTitle}>Location Required</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={buttonAction}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main app when everything is ready
  return (
    <Provider store={store}>
      <PaperProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SocketProvider>
            <LocationProvider initialLocation={location}>
              <SafeAreaProvider>
                <StatusBar style="auto" />
                <ErrorBoundaryWrapper>
                  <NavigationContainer>
                    <Stack.Navigator initialRouteName={isLogin ? 'Home' : 'Onboarding'}>
                      {renderRoutes()}
                    </Stack.Navigator>
                  </NavigationContainer>
                </ErrorBoundaryWrapper>
              </SafeAreaProvider>
            </LocationProvider>
          </SocketProvider>
        </GestureHandlerRootView>
      </PaperProvider>
    </Provider>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
  },
  errorIcon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: '#00aaa9',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

const WrappedApp = Sentry.wrap(App);

const RootApp = () => (
  <FoodProvider>
    <WrappedApp />
  </FoodProvider>
);

AppRegistry.registerComponent(appName, () => RootApp);

export default RootApp;