import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Platform,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  BackHandler,
  Alert,
  Image,
} from "react-native";
import * as Updates from "expo-updates";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useSocket } from "../context/SocketContext";

import RideCome from "./Ride.come";
import Report from "./Report/Report";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { initializeSocket } from "../context/socketService";

const HomeScreen = () => {
  const { isSocketReady, socket, isReconnecting } = useSocket();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [user_data, setUserData] = useState(null)
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation()

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const data = await fetchUserDetails()

    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token_cab');
      await SecureStore.deleteItemAsync("isOnline");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      })

      BackHandler.exitApp()
    } catch (error) {
      console.error('Logout Error:', error);
    }
    setMenuVisible(false);
  }, [navigation]);


  const handleHardReconnect = async (id) => {
    try {
      if (!id) {
        return alert('Please try to re login')
      }
      const isReconnectingHard = await initializeSocket({
        userId: id
      })

      console.log("i am socket", isReconnectingHard)

      await Updates.reloadAsync();
    } catch (error) {
      console.log("i am socket error", error)

    }
  }



  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token_cab');
      console.log(token)
      if (token) {
        const response = await axios.get(
          'https://demoapi.olyox.com/api/v1/rider/user-details',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("User Details:", response.data.partner);
        if (response.data.partner) {
          setUserData(response.data.partner);
          await initializeSocket({
            userId: response?.data?.partner?._id
          })
          return response.data.partner;
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails()
  }, [])

  const toggleOnlineStatus = async () => {
    setLoading(true);

    const expireDate = new Date(user_data?.RechargeData?.expireData);
    const currentDate = new Date();

    const goingOnline = !isOnline;

    try {
      const token = await SecureStore.getItemAsync("auth_token_cab");


      if (goingOnline && expireDate < currentDate) {
        Alert.alert(
          "Recharge Expired",
          "You have been set to offline due to expired recharge.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Recharge")
            }
          ]
        );
        setLoading(false);
        return;
      }

      // Always allow the API call if going OFFLINE regardless of recharge status
      const response = await axios.post(
        "https://demoapi.olyox.com/api/v1/rider/toggleWorkStatusOfRider",
        { status: goingOnline },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const response_two = await axios.get(
        "https://demoapi.olyox.com/api/v1/rider/user-details",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const partnerData = response_two.data.partner;
      setUserData(partnerData);

      if (response.data.success) {
        setIsOnline(goingOnline);
        await SecureStore.setItemAsync("isOnline", goingOnline.toString());
      }
    } catch (error) {
      Alert.alert(
        "Toggle Status Failed",
        error?.response?.data?.message || "Something went wrong",
        [{ text: "OK" }]
      );
      console.error("Toggle Status Error:", error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatToIST = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };


  const ConnectionStatus = () => (
    <View style={[
      styles.connectionStatus,
      { backgroundColor: socket?.connected ? '#FFF8E1' : '#FFEBEE' }
    ]}>
      <MaterialCommunityIcons
        name={socket?.connected ? "wifi-check" : "wifi-off"}
        size={20}
        color={socket?.connected ? '#FFB300' : '#C62828'}
      />
      <Text style={[
        styles.connectionText,
        { color: socket?.connected ? '#FFB300' : '#C62828' }
      ]}>
        {socket?.connected ? "Connected" : "Offline"}
      </Text>
    </View>
  );

  const Menu = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={menuVisible}
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setMenuVisible(false)}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Profile')
            }}
          >
            <MaterialCommunityIcons name="account" size={24} color="#FFB300" />
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>



          <View style={styles.menuDivider} />


          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Recharge')
            }}

          >
            <MaterialCommunityIcons name="contactless-payment" size={24} color="#FFB300" />
            <Text style={styles.menuText}>Recharge</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={24} color="#FFB300" />
            <Text style={styles.menuText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
          >
            <MaterialCommunityIcons name="bell" size={24} color="#212121" />
            <Text style={styles.count}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
          >
            <MaterialCommunityIcons name="dots-vertical" size={24} color="#212121" />
          </TouchableOpacity>

        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFB300']}
            tintColor="#FFB300"
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeCardContent}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  {user_data?.documents?.profile ? (
                    <Image source={{ uri: user_data?.documents?.profile }} style={styles.profileImage}
                      resizeMode="cover" />
                  ) : (
                    <MaterialCommunityIcons name="account" size={40} color="#FFB300" />

                  )}
                </View>
                <ConnectionStatus />
              </View>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>
                  Welcome back!
                </Text>
                <Text style={styles.subText}>
                  Your Recharge is End on {formatToIST(user_data?.RechargeData?.expireData)}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.onlineToggle,
                  { backgroundColor: isOnline ? '#FFF8E1' : '#FFEBEE' }
                ]}
                onPress={toggleOnlineStatus}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name={user_data?.isAvailable ? "car" : "car-off"}
                  size={24}
                  color={user_data?.isAvailable ? '#FFB300' : '#C62828'}
                />
                <Text style={[
                  styles.onlineToggleText,
                  { color: user_data?.isAvailable ? '#FFB300' : '#C62828' }
                ]}>
                  {loading ? 'Updating...' : (user_data?.isAvailable ? 'Online' : 'Offline')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.onlineToggle,
                  { backgroundColor: isOnline ? '#FFF8E1' : '#FFEBEE' }
                ]}
                onPress={() => handleHardReconnect(user_data?._id)}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name={isSocketReady ? "wifi-check" : "wifi-off"}
                  size={24}
                  color={user_data?.isAvailable ? '#FFB300' : '#C62828'}
                />
                <Text style={[
                  styles.connectionText,
                  { color: isSocketReady ? '#FFB300' : '#C62828' }
                ]}>
                  {isSocketReady ? "Connected" : "Offline"}
                </Text>
              </TouchableOpacity>
              <RideCome isRefresh={refreshing} />
            </View>
          </View>

          <Report isRefresh={refreshing} />
        </View>
      </ScrollView>

      <Menu />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  menuButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f7de02',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 8,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  welcomeCardContent: {
    padding: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
  },
  connectionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  welcomeTextContainer: {
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 24,
    color: '#212121',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: '#757575',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  onlineToggleText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#212121',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50, // Makes it circular if width and height are equal
    borderWidth: 2,
    borderColor: "#f7de02", // Example border color
  },
  count: {
    position: 'absolute',
    right: 0

  }
});

export default HomeScreen;