import { View, ActivityIndicator } from 'react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home/Home';
import Onboarding from './screens/Onboarding/Onboarding';
import BhVerification from './screens/Register/BhVerification';
import RegisterViaBh from './screens/Register/RegisterViaBh';
import BhOtpVerification from './screens/Register/BhOtpVerification';
import Hotel_List from './screens/Hotel_List/Hotel_List';
import VerifyOtp from './screens/Hotel_List/VerifyOtp';
import { TokenProvider, useToken } from './context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HotelListingForm from './screens/HotelListingForm/HotelListingForm';
import Login from './screens/Login/Login';
import AllRoom from './screens/Room/AllRoom';
import SingleDetailsPage from './screens/Room/SingleDetailsPage';
import Booking_create from './screens/Booking_create/Booking_create';
import AllBookings from './screens/AllBookings/AllBookings';
import AllGuests from './screens/Guests/AllGuests';
import Profile from './screens/Profile/Profile';
import Upload_Documents from './screens/Profile/Upload_Documents';
import Recharge from './screens/Recharge/Recharge';
import RechargeHistoryTiffin from './screens/Recharge/RechargeHistory';
import ReferralHistory from './screens/Refferal/ReferalHistory';
import { Withdraw } from './screens/Recharge/Withdraw';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {

  const { isLoggedIn, loading } = useToken();
  console.log(loading)

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isLoggedIn ? "Home" : "Onboard"}>
        <Stack.Screen name="Home" options={{ headerShown: false }} component={Home} />
        <Stack.Screen name="Onboard" options={{ headerShown: false }} component={Onboarding} />
        <Stack.Screen name="BhVerification" options={{ headerShown: false }} component={BhVerification} />
        <Stack.Screen name="Register" options={{ headerShown: false }} component={RegisterViaBh} />
        <Stack.Screen name="Login" options={{ headerShown: false }} component={Login} />
        <Stack.Screen name="OtpVerify" options={{ headerShown: false }} component={BhOtpVerification} />
        <Stack.Screen name="OtpVerifyRegister" options={{ headerShown: false }} component={VerifyOtp} />

        {/* Hotel Listing */}
        <Stack.Screen name="HotelListing" options={{ headerShown: false }} component={Hotel_List} />
        <Stack.Screen name="Rooms" options={{ headerShown: false }} component={HotelListingForm} />
        <Stack.Screen name="All Rooms" options={{ headerShown: false }} component={AllRoom} />
        <Stack.Screen name="RoomDetail" options={{ headerShown: false }} component={SingleDetailsPage} />


        {/* Booking */}
        <Stack.Screen name="Booking-create" options={{ headerShown: false }} component={Booking_create} />
        <Stack.Screen name="Bookings" options={{ headerShown: false }} component={AllBookings} />

        {/* Guests */}
        <Stack.Screen name="Guests" options={{ headerShown: false }} component={AllGuests} />

        {/* Profile */}

        <Stack.Screen name="Profile" options={{ headerShown: false }} component={Profile} />
        <Stack.Screen name="upload_Documents" options={{ headerShown: false }} component={Upload_Documents} />
        <Stack.Screen name="Recharge" options={{ headerShown: true }} component={Recharge} />
        <Stack.Screen name="Recharge History" options={{ headerShown: true }} component={RechargeHistoryTiffin} />
        <Stack.Screen name="Referral History" options={{ headerShown: true }} component={ReferralHistory} />
        <Stack.Screen name="Withdraw History" options={{ headerShown: false }} component={Withdraw} />


      </Stack.Navigator>
    </NavigationContainer>
  );
};

const RootApp = () => {
  return (
    <SafeAreaProvider>

      <TokenProvider>
        <AppNavigator />
      </TokenProvider>
    </SafeAreaProvider>
  );
};

export default RootApp;
