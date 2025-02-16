import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import HomeScreen from './screens/HomeScreen';
import { store } from './redux/store';
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
// import AllFood from './screens/AllFood';
import AllOrders from './screens/AllOrders'
import AllFood from './screens/AllFood'
import AllCustomTiffins from './screens/AllCustomTiffins';
import OnGoingOrder from './screens/OnGoingOrder';
import CompleteOrder from './screens/CompleteOrder';

const Stack = createNativeStackNavigator();

export default function App() {
  // const role = 'Hotel'
  // if (role === 'tiffin') {
  //   return (
  //     <Provider store={store}>
  //       <PaperProvider>
  //         <GestureHandlerRootView style={{ flex: 1 }}>
  //           <SafeAreaProvider>
  //             <NavigationContainer>
  //               <Stack.Navigator>
  //                 <Stack.Screen name="Profile" optizons={{ headerShown: true }} component={AllFood} />
  //                 <Stack.Screen name="Home" options={{ headerShown: false }} component={HomeScreen} />
  //                 <Stack.Screen name="Profile" options={{ headerShown: true }} component={Profile} />
  //                 <Stack.Screen name="New Order" options={{ headerShown: true }} component={NewOrder} />
  //                 <Stack.Screen name="Add Listing" options={{ headerShown: true }} component={AddListing} />
  //                 <Stack.Screen name="Customize Tiffine Plan" options={{ headerShown: true }} component={CustomizeTiffinPlan} />
  //                 <Stack.Screen name="Order Report" options={{ headerShown: true }} component={OrderReport} />
  //                 <Stack.Screen name="Recharge Plan" options={{ headerShown: true }} component={Recharge} />
  //                 <Stack.Screen name="Recharge History" options={{ headerShown: true }} component={RechargeHistory} />
  //                 <Stack.Screen name="Withdraw History" options={{ headerShown: true }} component={Withdraw} />
  //                 <Stack.Screen name="Change Password" options={{ headerShown: true }} component={ChangePassword} />
  //                 <Stack.Screen name="Referral History" options={{ headerShown: true }} component={ReferralHistory} />
  //                 <Stack.Screen name="Support" options={{ headerShown: true }} component={Support} />
  //                 <Stack.Screen name="Profile Update" options={{ headerShown: true }} component={ProfileUpdate} />
  //                 <Stack.Screen name="Help" options={{ headerShown: true }} component={Help} />
  //                 <Stack.Screen name="AllFood" options={{ headerShown: true }} component={AllOrders} />

  //               </Stack.Navigator>

  //             </NavigationContainer>
  //           </SafeAreaProvider>
  //         </GestureHandlerRootView>
  //       </PaperProvider>
  //     </Provider>
  //   );
  // }

  return (
    <Provider store={store}>
      <PaperProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen name="Home" options={{ headerShown: false }} component={HomeScreen} />
                <Stack.Screen name="Profile" options={{ headerShown: true }} component={Profile} />
                <Stack.Screen name="New Order" options={{ headerShown: true }} text={'New Order'} component={NewOrder} />
                <Stack.Screen name="Add Listing" options={{ headerShown: true }} text={'Add Listing'} component={AddListing} />
                <Stack.Screen name="Customize Tiffine Plan" options={{ headerShown: true }} text={'Add Customize Tiffin Plan'} component={CustomizeTiffinPlan} />
                <Stack.Screen name="Order Report" options={{ headerShown: true }} text={'Order Report'} component={OrderReport} />
                <Stack.Screen name="Recharge Plan" options={{ headerShown: true }} text={'Recharge Plan'} component={Recharge} />
                <Stack.Screen name="Recharge History" options={{ headerShown: true }} text={'Recharge History'} component={RechargeHistory} />
                <Stack.Screen name="Withdraw History" options={{ headerShown: true }} text={'Withdraw History'} component={Withdraw} />
                <Stack.Screen name="Change Password" options={{ headerShown: true }} text={'Change Password'} component={ChangePassword} />
                <Stack.Screen name="Referral History" options={{ headerShown: true }} text={'Referral History'} component={ReferralHistory} />
                <Stack.Screen name="Support" options={{ headerShown: true }} text={'Support'} component={Support} />
                <Stack.Screen name="Profile Update" options={{ headerShown: true }} text={'Profile Update'} component={ProfileUpdate} />
                <Stack.Screen name="Help" options={{ headerShown: true }} text={'Help'} component={Help} />
                <Stack.Screen name="All Order" options={{ headerShown: true }} text={'All Order'} component={AllOrders} />
                <Stack.Screen name="Login" options={{ headerShown: true }} text={'Login'} component={Login} />
                <Stack.Screen name="AllFood" options={{ headerShown: true }} text={'All Food'} component={AllFood} />
                <Stack.Screen name="CustomFood" options={{ headerShown: true }} text={'All Food'} component={AllCustomTiffins} />
                <Stack.Screen name="Running Order" options={{ headerShown: true }} text={'Running Order'} component={OnGoingOrder} />
                <Stack.Screen name="Complete Order" options={{ headerShown: true }} text={'Complete Order'} component={CompleteOrder} />

              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PaperProvider>
    </Provider>
  )

}

