import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import Icon from "react-native-vector-icons/FontAwesome5";
import { tokenCache } from "../../Auth/cache";
import { useSocket } from "../../context/SocketContext";
import { initializeSocket } from "../../services/socketService";
import { find_me } from "../../utils/helpers";

const ParcelBooking = () => {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("5");
  const [width, setWidth] = useState("4");
  const [height, setHeight] = useState("5");
  const [etaData, setEtaData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [customerName, setCustomerName] = useState("aa");
  const [customerPhone, setCustomerPhone] = useState("789654130");
  const [activeInput, setActiveInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [riderFound, setRiderFound] = useState(false);
  const socket = useSocket();

  const fetchSuggestions = useCallback(async (input) => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    try {
      const { data } = await axios.get("https://api.srtutorsbureau.com/autocomplete", {
        params: { input },
      });
      setSuggestions(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch location suggestions. Please try again.");
    }
  }, []);

  const handleLocationSelect = (location) => {
    if (activeInput === "pickup") {
      setPickup(location);
    } else {
      setDropoff(location);
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const findDistanceAndEtaOFPriceAndTime = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("https://demoapi.olyox.com/geo-code-distance", {
        pickup,
        dropOff: dropoff,
      });
      setEtaData(data);
    } catch (error) {
      console.log(error?.response?.data || "Error fetching distance & ETA");
      setError("Failed to calculate distance and ETA. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pickup && dropoff) {
      const delayDebounceFn = setTimeout(() => {
        findDistanceAndEtaOFPriceAndTime();
      }, 3000);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [pickup, dropoff]);

  const validateInputs = () => {
    if (!pickup || !dropoff || !weight || !length || !width || !height || !customerName || !customerPhone) {
      setError("Please fill in all fields");
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(customerName)) {
      setError("Please enter a valid name");
      return false;
    }
    if (!/^\d{10}$/.test(customerPhone)) {
      setError("Please enter a valid 10-digit phone number");
      return false;
    }
    return true;
  };

  const handleBookNow = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setError("");

    const payload = {
      pickup,
      dropoff,
      weight,
      length,
      width,
      height,
      customerName,
      customerPhone,
    };

    const gmail_token = await tokenCache.getToken("auth_token");
    const db_token = await tokenCache.getToken("auth_token_db");
    const token = db_token || gmail_token;

    try {
      const { data } = await axios.post("https://demoapi.olyox.com/api/v1/parcel/request_of_parcel", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Booking successful:", data);
      if (data.availableRiders.length === 0) {
        setError("No available riders");
        setLoading(false)
      }
    } catch (error) {
      console.log(error?.response?.data || "Error booking parcel");
      setError("Failed to book parcel. Please try again.");
    } finally {
      // setLoading(false);
    }
  };

  const redirectIfPartnerAccept = () => {
    console.log("redirectIfPartnerAccept")
    if (socket) {
      const orderAcceptedHandler = (data) => {
        console.log("Rider accepted order:", data);
        setLoading(false);
        setRiderFound(true);
      };
      socket.on("order_accepted_by_rider", orderAcceptedHandler);

      return () => {
        socket.off("order_accepted_by_rider", orderAcceptedHandler); // Cleanup
      };
    }
  };

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5; // Number of times to retry
    const retryDelay = 2000; // 2 seconds delay between retries

    const initialize = async () => {
      try {
        const data = await find_me();

        if (data?.user?._id) {
          initializeSocket({ userId: data.user._id });
          redirectIfPartnerAccept();
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Retrying fetch user data... Attempt ${retryCount}`);
          setTimeout(initialize, retryDelay);
        } else {
          console.error("Max retries reached. User ID is still missing.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    initialize();
  }, [socket]);


  useEffect(() => {
    // Listening for the event
    socket.on("order_accepted_by_rider", (data) => {
      console.log("Order accepted by rider:", data);
      alert(`Order accepted by rider`);
    });

    return () => {
      socket.off("order_accepted_by_rider");
    };
  }, []);



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>We found a rider for you...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Icon name="paper-plane" size={24} color="#f97316" />
        </TouchableOpacity>
      </View>


      <Image
        source={{ uri: "https://i.ibb.co/R4sjSHKm/pngwing-com-20.png" }}
        style={styles.truckImage}
        resizeMode="contain"
      />

      {/* Booking Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.title}>Booking a</Text>
        <Text style={styles.subtitle}>Pickup & Drop service</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>Enter</Text>

        {/* Pickup Location */}
        <View style={styles.inputContainer}>
          <Icon name="map-marker-alt" size={20} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="Pickup location"
            value={pickup}
            onChangeText={(text) => {
              setPickup(text)
              setActiveInput("pickup")
              fetchSuggestions(text)
            }}
          />
          {suggestions.length > 0 && activeInput === "pickup" && (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item?.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleLocationSelect(item?.description)} style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>{item?.description}</Text>
                </TouchableOpacity>
              )}
              style={styles.suggestionList}
            />
          )}
        </View>

        {/* Drop Location */}
        <View style={styles.inputContainer}>
          <Icon name="map-pin" size={20} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="Drop location"
            value={dropoff}
            onChangeText={(text) => {
              setDropoff(text)
              setActiveInput("dropoff")
              fetchSuggestions(text)
            }}
          />
          {suggestions.length > 0 && activeInput === "dropoff" && (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item?.place_id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleLocationSelect(item?.description)} style={styles.suggestionItem}>
                  <Text style={styles.suggestionText}>{item.description}</Text>
                </TouchableOpacity>
              )}
              style={styles.suggestionList}
            />
          )}
        </View>

        {/* ETA Data */}
        {etaData && (
          <View style={styles.etaContainer}>
            <Text style={styles.etaTitle}>Estimated Trip Details:</Text>
            <Text style={styles.etaText}>Distance: {etaData?.distance}</Text>
            <Text style={styles.etaText}>Duration: {etaData?.duration}</Text>
            <Text style={styles.etaText}>Price: {etaData?.price}</Text>
          </View>
        )}

        {/* Parcel Details Section */}
        <Text style={styles.sectionTitle}>Parcel Details</Text>

        {/* Weight Input */}
        <View style={styles.inputContainer}>
          <Icon name="weight-hanging" size={20} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
        </View>

        {/* Dimensions Input */}
        <View style={styles.dimensionsContainer}>
          <Icon name="cube" size={20} color="#9ca3af" style={styles.dimensionIcon} />
          <TextInput
            style={styles.dimensionInput}
            placeholder="L (cm)"
            value={length}
            onChangeText={setLength}
            keyboardType="numeric"
          />
          <Text style={styles.dimensionX}>x</Text>
          <TextInput
            style={styles.dimensionInput}
            placeholder="W (cm)"
            value={width}
            onChangeText={setWidth}
            keyboardType="numeric"
          />
          <Text style={styles.dimensionX}>x</Text>
          <TextInput
            style={styles.dimensionInput}
            placeholder="H (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
          />
        </View>

        {/* Customer Details */}
        <Text style={styles.sectionTitle}>Customer Details</Text>

        <View style={styles.inputContainer}>
          <Icon name="user" size={20} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="phone" size={20} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="Customer Phone"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Book Now Button */}
        <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f87171",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f87171",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  truckImage: {
    height: 256,
    width: "100%",
  },
  formCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: -20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  label: {
    color: "#6b7280",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  suggestionList: {
    maxHeight: 150,
    marginTop: 4,
    position: "absolute",
    width: "100%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    zIndex: 999,
  },
  suggestionItem: {
    padding: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: "#333",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
  },
  dimensionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dimensionIcon: {
    marginRight: 8,
  },
  dimensionInput: {
    flex: 1,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    fontSize: 16,
  },
  dimensionX: {
    paddingHorizontal: 8,
    color: "#6b7280",
  },
  bookButton: {
    backgroundColor: "#f97316",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
  },
  bookButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 10,
    textAlign: "center",
  },
  etaContainer: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  etaTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#374151",
  },
  etaText: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
  },
})

export default ParcelBooking

