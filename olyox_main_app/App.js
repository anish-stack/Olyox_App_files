import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import * as Location from 'expo-location';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { ActivityIndicator, View, Text, StyleSheet, Linking, Image, TouchableOpacity } from 'react-native';
import { store } from './redux/store';
import { SocketProvider } from './context/SocketContext';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import * as IntentLauncher from 'expo-intent-launcher';

// Import screens
import HomeScreen from './screens/HomeScreen';
import Collect_Data from './Ride/First_Step_screen/Collect_Data';
import Show_Cabs from './Ride/Show_near_by_cab/Show_Cabs';
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
  BACKGROUND_PERMISSION_DENIED: 'BACKGROUND_PERMISSION_DENIED',
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
      } finally {
        // Only finish loading when location is also handled
        if (!loading) {
          setLoading(false);
        }
      }
    };

    checkLoginStatus();
  }, []);

  // Open device settings
  const openSettings = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS
      );
    }
  }, []);

  // Get location with improved error handling
  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
  
      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorType(ERROR_TYPES.LOCATION_UNAVAILABLE);
        setLoading(false);
        return;
      }
  
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      console.log("foregroundStatus", foregroundStatus);
  
      if (foregroundStatus !== 'granted') {
        setErrorType(ERROR_TYPES.PERMISSION_DENIED);
        setLoading(false);
        return;
      }
  
      // Request background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log("backgroundStatus", backgroundStatus);
  
      if (backgroundStatus !== 'granted') {
        setErrorType(ERROR_TYPES.BACKGROUND_PERMISSION_DENIED);
        // Continue anyway since foreground is granted
      }
  
      // Add optional debug info about providers
      const providerStatus = await Location.getProviderStatusAsync();
      console.log('Provider Status:', providerStatus);
  
      // Wrap watchPositionAsync with timeout
      const locationPromise = new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Location fetch timeout'));
        }, 30000); // 30 sec timeout
  
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location) => {
            clearTimeout(timeout);
            subscription.remove(); // stop watching after first fix
            resolve(location);
          }
        );
      });
  
      const fetchedLocation = await locationPromise;
      console.log("fetchedLocation", fetchedLocation);
  
      setLocation(fetchedLocation);
      setErrorType(null);
      setLoading(false);
      setLocationFetchRetries(0);
  
    } catch (error) {
      console.error('Error fetching location have come from app:', error);
      Sentry.captureException(error);
  
      if (error.message === 'Location fetch timeout') {
        setErrorType(ERROR_TYPES.TIMEOUT);
      } else {
        setErrorType(ERROR_TYPES.UNKNOWN);
      }
  
      setLocationFetchRetries(prev => prev + 1);
      setLoading(false);
    }
  }, [locationFetchRetries]);

  // Initial location fetch
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Auto-retry location fetch up to 3 times with increasing delays
  useEffect(() => {
    if (errorType === ERROR_TYPES.TIMEOUT || errorType === ERROR_TYPES.UNKNOWN) {
      if (locationFetchRetries <= 3) {
        const retryDelay = locationFetchRetries * 5000; // Increasing delay
        const retryTimer = setTimeout(() => {
          getCurrentLocation();
        }, retryDelay);
        
        return () => clearTimeout(retryTimer);
      }
    }
  }, [errorType, locationFetchRetries, getCurrentLocation]);

  // Background location tracking setup
  useEffect(() => {
    if (location && !errorType) {
      // Set up background location tracking when we have permissions and initial location
      const setupBackgroundTracking = async () => {
        try {
          await Location.startLocationUpdatesAsync('background-location-task', {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 100,
            foregroundService: {
              notificationTitle: "Location Active",
              notificationBody: "Your location is being tracked for ride services",
            },
          });
        } catch (error) {
          console.error('Failed to start background location updates:', error);
          Sentry.captureException(error);
          // Continue app operation even if background tracking fails
        }
      };
      
      if (errorType !== ERROR_TYPES.BACKGROUND_PERMISSION_DENIED) {
        setupBackgroundTracking();
      }
    }
  }, [location, errorType]);

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
    let buttonAction = getCurrentLocation;
    let iconSource = `https://res.cloudinary.com/dglihfwse/image/upload/v1744271215/pin_zpnnjn.png`; // Assume this exists
    
    switch (errorType) {
      case ERROR_TYPES.PERMISSION_DENIED:
        errorMessage = 'Location access is required to use this app. Please grant location permissions.';
        buttonText = 'Open Settings';
        buttonAction = openSettings;
        break;
        
      case ERROR_TYPES.BACKGROUND_PERMISSION_DENIED:
        // We continue with app anyway, this is just a warning
        return (
          <Provider store={store}>
            <PaperProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <SocketProvider>
                  <LocationProvider initialLocation={location}>
                    <SafeAreaProvider>
                      <ErrorBoundaryWrapper>
                        <NavigationContainer>
                          <Stack.Navigator initialRouteName={isLogin ? 'Home' : 'Onboarding'}>
                            {/* All routes... */}
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
          source={{uri:iconSource}}
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