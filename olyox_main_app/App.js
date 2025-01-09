import React, { useEffect, useState } from 'react';
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
          <SafeAreaProvider>
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen name="Home" options={{ headerShown: false }} component={HomeScreen} />


                {/* Booking Ride Start Here */}
                <Stack.Screen name="Start_Booking_Ride" options={{ headerShown: false }} component={Collect_Data} />
                <Stack.Screen name="second_step_of_booking" options={{ headerShown: false }} component={Show_Cabs} />



              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PaperProvider>
    </Provider>
  );
}

