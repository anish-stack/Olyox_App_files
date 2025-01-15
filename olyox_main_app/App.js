import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import * as Location from 'expo-location';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import HomeScreen from './screens/HomeScreen';
import { store } from './redux/store';
import Collect_Data from './Ride/First_Step_screen/Collect_Data';
import Show_Cabs from './Ride/Show_near_by_cab/Show_Cabs';
import { BookingConfirmation } from './Ride/Show_near_by_cab/confirm_booking';
import { DriverMatching } from './Ride/Show_near_by_cab/Driver_matching';
import { RideConfirmed } from './Ride/Show_near_by_cab/Ride_Confirmed';
import { SocketProvider } from './context/SocketContext';
import Hotels_details from './Hotels/Hotel_Details/Hotels_details';
import Single_Hotel_details from './Hotels/Hotel_Details/Single_Hotel_details';
import BookingSuccess from './Hotels/Hotel_Details/BookingSuccess';

const Stack = createNativeStackNavigator();

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);


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

  return (
    <Provider store={store}>
      <PaperProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SocketProvider>
            <SafeAreaProvider>
              <NavigationContainer>
                <Stack.Navigator>
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


                </Stack.Navigator>
              </NavigationContainer>
            </SafeAreaProvider>
          </SocketProvider>
        </GestureHandlerRootView>
      </PaperProvider>
    </Provider>
  );
}
