import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StatusBar,
  FlatList,
  Animated,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import axios from "axios"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import Food_Card from "../Food_Card/Food_Card"
import { LinearGradient } from "expo-linear-gradient"
import SuperFicial from "../../SuperFicial/SuperFicial"
import { useFood } from "../../context/Food_Context/Food_context"

const BANNER_HEIGHT = 250
const HEADER_MAX_HEIGHT = 60
const HEADER_MIN_HEIGHT = 0
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT

export default function Restaurant() {
  const route = useRoute()
  const { cart } = useFood()
  const navigation = useNavigation()
  const { item } = route.params || {}
  const [details, setDetails] = useState(null)
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const scrollY = new Animated.Value(0)

  const fetchFoods = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(
        `https://demoapi.olyox.com/api/v1/tiffin/find_Restaurant_And_Her_foods?restaurant_id=${item}`,
      )
      if (data.details) {
        setDetails(data.details)
        console.log("details?.isWorking", data)
        setFoods(data.food)
      }
    } catch (error) {
      setError("Unable to fetch restaurant data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [item])

  useEffect(() => {
    fetchFoods()
  }, [fetchFoods])

  const handleCall = () => {
    if (details?.restaurant_phone) {
      Linking.openURL(`tel:${details.restaurant_phone}`)
    }
  }

  const renderBanner = () => (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, HEADER_SCROLL_DISTANCE],
                outputRange: [0, -HEADER_SCROLL_DISTANCE],
                extrapolate: "clamp",
              }),
            },
          ],
        },
      ]}
    >
      <Image source={{ uri: "https://placehold.co/600x400/orange/white?text=Hello+World" }} style={styles.bannerImage} />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.bannerGradient}>
        <Animated.Text
          style={[
            styles.restaurantName,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
                outputRange: [1, 0.5, 0],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, HEADER_SCROLL_DISTANCE],
                    outputRange: [0, 50],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          {details?.restaurant_name}
        </Animated.Text>
        <View style={styles.restaurantInfoContainer}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{details?.rating || "New"}</Text>
          </View>
          <Text style={styles.restaurantCategory}>{details?.restaurant_category}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  )

  const renderDetails = () => (
    <View style={styles.detailsContainer}>
      <View>
        {details?.isWorking ? (
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={styles.badgeText}>Delivery Available</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgeError]}>
            <Text style={styles.badgeText}>Delivery Not Available - Restaurant Closed</Text>
          </View>
        )}
      </View>
      <View style={styles.detailsHeader}>
        <Text style={styles.sectionTitle}>Restaurant Info</Text>
        <TouchableOpacity style={styles.moreInfoButton}>
          <Text style={styles.moreInfoText}>More Info</Text>
          <Icon name="chevron-right" size={20} color="#E23744" />
        </TouchableOpacity>
      </View>
      <View style={styles.detailsContent}>
        <View style={styles.detailItem}>
          <Icon name="map-marker" size={24} color="#E23744" />
          <Text style={styles.detailText} numberOfLines={2}>
            {`${details?.restaurant_address.street}, ${details?.restaurant_address.city}`}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="clock-outline" size={24} color="#E23744" />
          <Text style={styles.detailText}>{details?.openingHours}</Text>
        </View>
        <TouchableOpacity style={styles.detailItem} onPress={handleCall}>
          <Icon name="phone" size={24} color="#E23744" />
          <Text style={[styles.detailText, styles.phoneNumber]}>{details?.restaurant_phone}</Text>
        </TouchableOpacity>
      </View>




      <View style={styles.tagsContainer}>
        {details?.restaurant_category === "Veg" && (
          <View style={styles.tag}>
            <Icon name="leaf" size={16} color="#4CAF50" />
            <Text style={styles.tagText}>Pure Veg</Text>
          </View>
        )}
        <View style={styles.tag}>
          <Icon name="silverware-fork-knife" size={16} color="#FF9800" />
          <Text style={styles.tagText}>Great Dining Experience</Text>
        </View>
        <View style={styles.tag}>
          <Icon name="shield-check" size={16} color="#2196F3" />
          <Text style={styles.tagText}>Follows Safety Standards</Text>
        </View>
      </View>
    </View>
  )

  const renderFoodList = () => (
    <View style={styles.foodListContainer}>
      <Text style={styles.sectionTitle}>Menu</Text>
      <FlatList
        data={foods}
        renderItem={({ item }) => <Food_Card isAddAble={details?.isWorking} item={item} />}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E23744" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchFoods}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {renderBanner()}
        {renderDetails()}
        {renderFoodList()}
      </Animated.ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-left" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      {/* <TouchableOpacity style={styles.callButton} onPress={handleCall}>
        <Icon name="phone" size={24} color="#FFFFFF" />
      </TouchableOpacity> */}
      <SuperFicial cart={cart} restaurant_id={details} totalAmount={400} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#E23744",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#E23744",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  bannerContainer: {
    height: BANNER_HEIGHT,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BANNER_HEIGHT,
    justifyContent: "flex-end",
    padding: 15,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  restaurantInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  ratingText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 4,
  },
  restaurantCategory: {
    fontSize: 16,
    color: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsContainer: {
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  moreInfoButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  moreInfoText: {
    color: "#E23744",
    fontWeight: "600",
    marginRight: 4,
  },
  detailsContent: {
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
    flex: 1,
  },
  phoneNumber: {
    color: "#E23744",
    textDecorationLine: "underline",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 12,
    color: "#333",
    marginLeft: 5,
  },
  foodListContainer: {
    padding: 15,
  },
  backButton: {
    position: "absolute",
    top: StatusBar.currentHeight + 10,
    left: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  callButton: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: "#E23744",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  badgeSuccess: {
    backgroundColor: '#28a745', // Green for Available
  },
  badgeError: {
    backgroundColor: '#dc3545', // Red for Not Available
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
})

