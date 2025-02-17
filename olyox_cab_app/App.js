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
import OngoingOrderScreen from './Parcel_Partner_Screens/Other_Parcel_Screens/Ongoing/OngoingOrderScreen';
import { LocationProvider } from './Parcel_Partner_Screens/Other_Parcel_Screens/Ongoing/LocationContext';
import All_Orders from './Parcel_Partner_Screens/All_Orders/All_Orders';
import OrderDetails from './Parcel_Partner_Screens/All_Orders/OrderDetails';
import RegistrationForm from './screens/onboarding/registration/RegistrationForm';
import Document from './screens/onboarding/registration/Document';
import * as SecureStore from 'expo-secure-store';

const Stack = createNativeStackNavigator();

export default function App() {
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageUplaod, setImageUplaod] = useState(true);

  useEffect(() => {
    const checkAuthToken = async () => {
      // await AsyncStorage.removeItem('auth_token_partner');
      const token = await AsyncStorage.getItem('auth_token_partner');
     
      const authToken = token 
      console.log(authToken)
  
      if (authToken) {
        try {
          const response = await axios.get(
            'https://demoapi.olyox.com/api/v1/parcel/user-details',  // Replace with your API endpoint
            {
              headers: { Authorization: `Bearer ${authToken}` },
            }
          );
          console.log("data",response.data.partner);
          setImageUplaod(response?.data?.partner?.isDocumentUpload)
          setUserType(response?.data?.partner?.type || '');  // Set the user type from the API response
        } catch (error) {
          console.error('Error fetching user details:', error.response.data.message);
        }
      } else {
        setUserType(null);  // If no token is found, set userType as null
      }
      setLoading(false);  // Done loading
    };
  
    checkAuthToken();
  }, []);
  

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if(!imageUplaod){
    return <Document/>
    
  }

  console.log("userType",userType)
  return (
    <Provider store={store}>
      <PaperProvider>
        <SocketProvider>
          <LocationProvider>

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


                    <Stack.Screen name="Ongoing_Order" options={{ headerShown: false }} component={OngoingOrderScreen} />
                    <Stack.Screen name="All_Orders_parcel" options={{ headerShown: true, title: "All Orders" }} component={All_Orders} />
                    <Stack.Screen name="Order_View" options={{ headerShown: false, title: "Order" }} component={OrderDetails} />
                    <Stack.Screen name="start" options={{ headerShown: false }} component={start} />
                    <Stack.Screen name="collect_money" component={MoneyPage} />
                    <Stack.Screen name="register"  options={{ headerShown: true,title:"Register" }}  component={RegistrationForm} />
                    <Stack.Screen name="upload_images"  options={{ headerShown: true,title:"Upload Required Documents" }}  component={Document} />
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
