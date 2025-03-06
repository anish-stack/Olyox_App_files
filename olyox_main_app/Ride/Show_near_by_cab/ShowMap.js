import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Map from "../Map/Map";
import axios from 'axios';
import { ArrowLeft, Bell, Clock, ChevronRight } from "lucide-react-native";
export default function ShowMap({ data }) {
  const [loading, setLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);
  const [rides, setRides] = useState([]);
  const navigation = useNavigation();

  const data_found = data || {};
  const { dropoff, pickup } = data_found || {};

  const origin =
    pickup?.latitude && pickup?.longitude
      ? { latitude: pickup.latitude, longitude: pickup.longitude }
      : { latitude: 28.7161663, longitude: 77.1240672 };

  const destination =
    dropoff?.latitude && dropoff?.longitude
      ? { latitude: dropoff.latitude, longitude: dropoff.longitude }
      : { latitude: 28.70406, longitude: 77.102493 };

  useEffect(() => {
    setTimeout(() => setLoading(false), 2000);
  }, []);

  const fetchRidesVehicle = async () => {
    try {
      const { data } = await axios.get(`https://demoapi.olyox.com/api/v1/admin/getAllSuggestions`);
      if (data) {
        setRides(data.data);
      } else {
        setRides([]);
      }
    } catch (error) {
      console.log(error?.response?.data || error.message);
      setRides([]);
    }
  };

  useEffect(() => {
    fetchRidesVehicle();
  }, []);

  const handleBookNow = () => {
    if (!selectedRide) {
      alert("Please select a ride option.");
      return;
    }
    navigation.navigate("confirm_screen", {
      origin,
      destination,
      selectedRide,
      dropoff,
      pickup,
    });
  };

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft color="#000" size={24} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>OLYOX RIDES</Text>
      <TouchableOpacity style={styles.notificationButton}>
        <Bell color="#000" size={20} />
      </TouchableOpacity>
    </View>
  );

  const RewardBanner = () => (
    <View style={styles.rewardBanner}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a23cbb?q=80&w=1000&auto=format&fit=crop' }}
        style={styles.coinIcon}
      />
      <Text style={styles.rewardText}>Get up to 8 OlyoxCoin with this booking</Text>
    </View>
  );

  const LocationSection = () => (
    <View style={styles.locationContainer}>
      <View style={styles.locationItem}>
        <View style={styles.greenDot} />
        <Text style={styles.locationText} numberOfLines={1}>
          {pickup?.description || "Current Location"}
        </Text>
        <View style={styles.timeBox}>
          <Clock size={12} color="#666" />
          <Text style={styles.timeText}>Now</Text>
        </View>
      </View>
      <View style={styles.locationDivider} />
      <View style={styles.locationItem}>
        <View style={styles.redDot} />
        <Text style={styles.locationText} numberOfLines={1}>
          {dropoff?.description || "Destination"}
        </Text>
      </View>
    </View>
  );

  const RideOption = ({ ride }) => {
    const isSelected = selectedRide?._id === ride._id;

    return (
      <TouchableOpacity
        style={[styles.rideOption, isSelected && styles.selectedRide]}
        onPress={() => setSelectedRide(ride)}
        activeOpacity={0.7}
      >
        <View style={styles.rideLeft}>
          <View style={styles.rideIconContainer}>
            <Text style={styles.rideIcon}>{ride.type === "car" ? "🚗" : "🏍️"}</Text>
          </View>
          <View style={styles.rideInfo}>
            <Text style={styles.rideName}>{ride.name}</Text>
            <Text style={styles.rideDescription}>{ride.description}</Text>
            <Text style={styles.rideTime}>
              <Clock size={12} color="#666" /> {ride.time || "10 min"}
            </Text>
          </View>
        </View>
        <View style={styles.rideRight}>
          <View style={[styles.selectIndicator, isSelected && styles.selectedIndicator]} />
        </View>
      </TouchableOpacity>
    );
  };

  const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loaderCard}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Finding the best rides for you...</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <LoadingScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.mapWrapper}>
        <Map origin={origin} destination={destination} />
      </View>
      <View style={styles.contentWrapper}>
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <RewardBanner />
          <LocationSection />
          <View style={styles.ridesSection}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            {rides.length > 0 ? (
              rides.map((ride) => <RideOption key={ride._id || ride.id} ride={ride} />)
            ) : (
              <View style={styles.noRidesContainer}>
                <Text style={styles.noRidesText}>No rides available at the moment</Text>
              </View>
            )}
          </View>
        </ScrollView>
        <View style={styles.bookButtonContainer}>
          <TouchableOpacity
            onPress={handleBookNow}
            style={styles.bookButton}
            activeOpacity={0.8}
          >
            <Text style={styles.bookButtonText}>
              {selectedRide ? `Book ${selectedRide.name}` : "Select a Ride"}
            </Text>
            <ChevronRight color="#fff" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  mapWrapper: {
    height: height * 0.35,
    backgroundColor: "#f0f0f0",
  },
  contentWrapper: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  contentContainer: {
    flex: 1,
  },
  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  coinIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    borderRadius: 10,
  },
  rewardText: {
    color: "#8B4513",
    fontSize: 14,
  },
  locationContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  locationDivider: {
    height: 20,
    width: 1,
    backgroundColor: "#ddd",
    marginLeft: 5,
  },
  greenDot: {
    width: 10,
    height: 10,
    backgroundColor: "#4CAF50",
    borderRadius: 5,
    marginRight: 12,
  },
  redDot: {
    width: 10,
    height: 10,
    backgroundColor: "#F44336",
    borderRadius: 5,
    marginRight: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#666",
  },
  ridesSection: {
    flex: 1,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    padding: 16,
    color: "#333",
  },
  rideOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedRide: {
    backgroundColor: "#E0F7FA",
    borderWidth: 2,
    borderColor: "#00BCD4",
  },
  rideLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rideIconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 12,
  },
  rideIcon: {
    fontSize: 24,
  },
  rideInfo: {
    flex: 1,
  },
  rideName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  rideDescription: {
    color: "#666",
    fontSize: 14,
    marginTop: 2,
  },
  rideTime: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  rideRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  selectedIndicator: {
    borderColor: "#00BCD4",
    backgroundColor: "#00BCD4",
  },
  bookButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  bookButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    height: height,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  loaderCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: width * 0.8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  noRidesContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  noRidesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});