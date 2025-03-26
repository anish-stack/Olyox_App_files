import { View, Text, TouchableOpacity, Linking, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import styles from "./Styles"

const OrderDetails = ({ orderData }) => {
  return (
    <>
      <View style={styles.orderInfo}>
        <Text style={styles.orderInfoTitle}>Order #{orderData._id.toString().slice(-6)}</Text>
        <Text style={styles.orderInfoStatus}>Status: {orderData.status}</Text>
      </View>

      <View style={styles.locationInfo}>
        <View style={styles.locationItem}>
          <Ionicons name="location" size={24} color="#4CAF50" />
          <View>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationText}>{orderData.pickupLocation}</Text>
          </View>
        </View>
        <View style={styles.locationItem}>
          <Ionicons name="flag" size={24} color="#F44336" />
          <View>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.locationText}>{orderData.dropoffLocation}</Text>
          </View>
        </View>
      </View>


      <View style={styles.parcelInfo}>
        <Text style={styles.parcelInfoTitle}>Customer Details</Text>
        <View style={styles.parcelInfoItem}>
          <Text style={styles.parcelInfoLabel}>Name:</Text>
          <Text style={styles.parcelInfoText}>{orderData?.customerName}</Text>
        </View>
        <View style={styles.parcelInfoItem}>
          <Text style={styles.parcelInfoLabel}>Phone:</Text>
          <TouchableOpacity
            onPress={() => {
              if (!orderData?.customerPhone) {
                Alert.alert("Error", "Phone number is not available")
                return
              }
              Linking.openURL(`tel:${orderData.customerPhone}`).catch((err) =>
                Alert.alert("Error", "Unable to open dialer"),
              )
            }}
          >
            <Text style={styles.parcelInfoText}>{orderData?.customerPhone} / Click To Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tripInfo}>
        <Text style={styles.tripInfoTitle}>Trip Information</Text>
        <View style={styles.tripInfoItem}>
          <Text style={styles.tripInfoLabel}>Total Distance:</Text>
          <Text style={styles.tripInfoText}>{orderData.totalKm.toFixed(2)} km</Text>
        </View>
        <View style={styles.tripInfoItem}>
          <Text style={styles.tripInfoLabel}>Price:</Text>
          <Text style={styles.tripInfoText}>₹{orderData.price.toFixed(2)}</Text>
        </View>
      </View>
    </>
  )
}

export default OrderDetails

