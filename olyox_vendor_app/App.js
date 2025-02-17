import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { store } from './redux/store';
import HomeScreen from './screens/HomeScreen';
import Profile from './screens/Profile';
import { NewOrder } from './screens/NewOrder';
import AddListing from './screens/AddListing';
import { CustomizeTiffinPlan } from './screens/CustomizeTiffinPlan';
import { OrderReport } from './screens/OrderReport';
import { Recharge } from './screens/Recharge';
import { RechargeHistory } from './screens/RechargeHistory';
import { Withdraw } from './screens/Withdraw';
import { ChangePassword } from './screens/ChangePassoword';
import ReferralHistory from './screens/ReferralHistory';
import { Support } from './screens/Support';
import { ProfileUpdate } from './screens/ProfileUpdate';
import Help from './screens/Help';
import { Login } from './screens/Login';
import AllOrders from './screens/AllOrders';
import AllFood from './screens/AllFood';
import AllCustomTiffins from './screens/AllCustomTiffins';
import OnGoingOrder from './screens/OnGoingOrder';
import CompleteOrder from './screens/CompleteOrder';
import RegistrationForm from './screens/RegistrationForm';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');

        if (!storedToken) {
          setInitialRoute('Login');
          setIsLoading(false);
          return;
        }

        const { data } = await axios.get(
          'https://demoapi.olyox.com/api/v1/tiffin/get_single_tiffin_profile',
          {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          }
        );

        if (data?.data) {
          setIsActive(data.data.isWorking);
          setInitialRoute(data.data.isWorking ? 'Home' : 'Home');
        } else {
          console.error("Error: restaurant_id not found in API response");
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error("Internal server error", error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00aaa9" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <PaperProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName={initialRoute}>
                <Stack.Screen name="Home" options={{ headerShown: false }} component={HomeScreen} />
                <Stack.Screen name="Profile" options={{ headerShown: true }} component={Profile} />
                <Stack.Screen name="New Order" options={{ headerShown: true }} component={NewOrder} />
                <Stack.Screen name="Add Listing" options={{ headerShown: true }} component={AddListing} />
                <Stack.Screen name="Customize Tiffine Plan" options={{ headerShown: true }} component={CustomizeTiffinPlan} />
                <Stack.Screen name="Order Report" options={{ headerShown: true }} component={OrderReport} />
                <Stack.Screen name="Recharge Plan" options={{ headerShown: true }} component={Recharge} />
                <Stack.Screen name="Recharge History" options={{ headerShown: true }} component={RechargeHistory} />
                <Stack.Screen name="Withdraw History" options={{ headerShown: true }} component={Withdraw} />
                <Stack.Screen name="Change Password" options={{ headerShown: true }} component={ChangePassword} />
                <Stack.Screen name="Referral History" options={{ headerShown: true }} component={ReferralHistory} />
                <Stack.Screen name="Support" options={{ headerShown: true }} component={Support} />
                <Stack.Screen name="Profile Update" options={{ headerShown: true, title: 'Profile' }} component={ProfileUpdate} />
                <Stack.Screen name="Help" options={{ headerShown: true }} component={Help} />
                <Stack.Screen name="All Order" options={{ headerShown: true }} component={AllOrders} />
                <Stack.Screen name="Login" options={{ headerShown: true }} component={Login} />
                <Stack.Screen name="Regisiter" options={{ headerShown: true }} component={RegistrationForm} />
                <Stack.Screen name="AllFood" options={{ headerShown: true }} component={AllFood} />
                <Stack.Screen name="CustomFood" options={{ headerShown: true }} component={AllCustomTiffins} />
                <Stack.Screen name="Running Order" options={{ headerShown: true }} component={OnGoingOrder} />
                <Stack.Screen name="Complete Order" options={{ headerShown: true }} component={CompleteOrder} />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PaperProvider>
    </Provider>
  );
}
