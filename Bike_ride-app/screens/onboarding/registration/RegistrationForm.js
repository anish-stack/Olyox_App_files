
import { useState } from "react"
import { View, StyleSheet, ScrollView, ImageBackground } from "react-native"
import { TextInput, Button, Card, Title, Paragraph, ActivityIndicator, Snackbar, Menu } from "react-native-paper"
import axios from "axios"
import { Alert } from "react-native"
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from "@react-navigation/native"

const API_BASE_URL = "https://api.olyox.com/api/v1"
const MAIN_API_BASE_URL = "http://192.168.1.4:3000/api/v1/rider"

const vehicleTypes = ["SEDAN", "SUV", "PRIME", "MINI"]
const vehicleBrands = [
  "Maruti Suzuki",
  "Hyundai",
  "Tata Motors",
  "Mahindra & Mahindra",
  "Kia",
  "Toyota",
  "MG Motor",
  "Honda",
  "Renault",
  "Skoda",
]

export default function RegistrationForm() {
  const [step, setStep] = useState(1)
  const [bhId, setBhId] = useState("BH")
  const [userData, setUserData] = useState(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [vehicleName, setVehicleName] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [pricePerKm, setPricePerKm] = useState("")
  const [vehicleNumber, setVehicleNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [vehicleTypeMenuVisible, setVehicleTypeMenuVisible] = useState(false)
  const [vehicleNameMenuVisible, setVehicleNameMenuVisible] = useState(false)
  const navigation = useNavigation()
  const fetchUserDetails = async () => {
    if (!bhId) {
      setError("Please enter a BH ID")
      return
    }
    setLoading(true)
    setError("")
    try {
      const response = await axios.get(`${API_BASE_URL}/app-get-details?Bh=${bhId}`)
      if (response.data.success) {
        setUserData(response.data.data)
        setName(response.data.data.name)
        setPhone(response.data.data.phone || "")
        setStep(2)
      } else {
        setError("User not found")
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      setError("Failed to fetch user details")
    } finally {
      setLoading(false)
    }
  }

  const registerRider = async () => {
    if (!validateForm()) {
      return
    }
    setLoading(true)
    setError("")
    try {
      const response = await axios.post(`${MAIN_API_BASE_URL}/register`, {
        name,
        phone,
        rideVehicleInfo: {
          vehicleName,
          vehicleType,
          PricePerKm: pricePerKm,
          VehicleNumber: vehicleNumber,
        },
        BH: bhId,
      })

      if (response.data.success) {
        setStep(3)
        setSuccess("Registration successful. Please enter OTP.")
      } else {
        setError(response.data.message)
      }
    } catch (error) {
      console.error("Error registering rider:", error)
      setError("Failed to register rider")
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!otp) {
      setError("Please enter OTP")
      return
    }
    setLoading(true)
    setError("")
    try {
      const { data } = await axios.post(`${MAIN_API_BASE_URL}/rider-verify`, {
        number: phone,
        otp,
      })
      const { success, token } = data
      await SecureStore.setItemAsync('auth_token_cab', token)

      if (success) {
        setSuccess("OTP verified successfully")
        navigation.navigate('UploadDocuments')
      }
    } catch (error) {
      console.log(error.response)
      setLoading(false)
      Alert.alert("Error", error.response.data.message)

    }
    // Implement OTP verification logic here

  }

  const resendOtp = async () => {

    setLoading(true)
    setError("")
    try {
      const { data } = await axios.post(`${MAIN_API_BASE_URL}/rider-resend`, {
        number: phone
      })
      console.log(data)
      setTimeout(() => {
        setLoading(false)
        setSuccess("OTP resend successfully")
      }, 2000)
    } catch (error) {

      setLoading(false)
      console.log(error.response)
      Alert.alert("Error", error.response.data.message)


    }
    // Implement OTP verification logic here
    // For now, we'll just simulate a successful verification

  }


  const validateForm = () => {
    let missingFields = [];

    if (!name) missingFields.push("Name");
    if (!phone) missingFields.push("Phone");
    if (!vehicleName) missingFields.push("Vehicle Name");
    if (!vehicleType) missingFields.push("Vehicle Type");
    if (!pricePerKm) missingFields.push("Price Per Km");
    if (!vehicleNumber) missingFields.push("Vehicle Number");

    if (missingFields.length > 0) {
      setError(`Please fill in the following fields: ${missingFields.join(", ")}`);
      return false;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Invalid phone number")
      return false
    }
    const price = Number.parseFloat(pricePerKm)
    if (isNaN(price) || price <= 15) {
      setError("Price per Km must be a number greater than 15")
      return false
    }
    return true
  }

  const renderUserInfo = () => {
    if (!userData) return null
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>User Information</Title>
          <Paragraph style={styles.cardParagraph}>Name: {userData.name}</Paragraph>
          <Paragraph style={styles.cardParagraph}>Email: {userData.email}</Paragraph>
          <Paragraph style={styles.cardParagraph}>Plan: {userData.member_id.title}</Paragraph>
          <Paragraph style={styles.cardParagraph}>
            Free Plan Active: {userData.isFreePlanActive ? "Yes" : "No"}
          </Paragraph>
          <Paragraph style={styles.cardParagraph}>Category: {userData.category.title}</Paragraph>
        </Card.Content>
      </Card>
    )
  }

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <TextInput
        label="BH ID"
        value={bhId}
        onChangeText={setBhId}
        mode="outlined"
        keyboardType={"number-pad"}
        style={styles.input}
        theme={{ colors: { primary: "#f7de02" } }}
      />
      <Button mode="contained" onPress={fetchUserDetails} style={styles.button} labelStyle={styles.buttonLabel}>
        Next
      </Button>
    </View>
  )

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {renderUserInfo()}
      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        theme={{ colors: { primary: "#f7de02" } }}
      />
      <TextInput
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        style={styles.input}
        keyboardType="phone-pad"
        theme={{ colors: { primary: "#f7de02" } }}
      />
      <Menu
        visible={vehicleTypeMenuVisible}
        onDismiss={() => setVehicleTypeMenuVisible(false)}
        anchor={
          <Button onPress={() => setVehicleTypeMenuVisible(true)} mode="outlined" style={styles.input}>
            {vehicleType || "Select Vehicle Type"}
          </Button>
        }
      >
        {vehicleTypes.map((type) => (
          <Menu.Item
            key={type}
            onPress={() => {
              setVehicleType(type)
              setVehicleTypeMenuVisible(false)
            }}
            title={type}
          />
        ))}
      </Menu>
      <Menu
        visible={vehicleNameMenuVisible}
        onDismiss={() => setVehicleNameMenuVisible(false)}
        anchor={
          <Button onPress={() => setVehicleNameMenuVisible(true)} mode="outlined" style={styles.input}>
            {vehicleName || "Select Vehicle Brand"}
          </Button>
        }
      >
        {vehicleBrands.map((brand) => (
          <Menu.Item
            key={brand}
            onPress={() => {
              setVehicleName(brand)
              setVehicleNameMenuVisible(false)
            }}
            title={brand}
          />
        ))}
      </Menu>
      <TextInput
        label="Price per Km"
        value={pricePerKm}
        onChangeText={setPricePerKm}
        mode="outlined"
        style={styles.input}
        keyboardType="numeric"
        theme={{ colors: { primary: "#f7de02" } }}
      />
      <TextInput
        label="Vehicle Number"
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
        mode="outlined"
        style={styles.input}
        theme={{ colors: { primary: "#f7de02" } }}
      />
      <Button mode="contained" onPress={registerRider} style={styles.button} labelStyle={styles.buttonLabel}>
        Register
      </Button>
    </View>
  )

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <TextInput
        label="OTP"
        value={otp}
        onChangeText={setOtp}
        mode="outlined"
        style={styles.input}
        keyboardType="numeric"
        theme={{ colors: { primary: "#f7de02" } }}
      />
      <Button mode="contained" onPress={verifyOtp} style={styles.button} labelStyle={styles.buttonLabel}>
        Verify OTP
      </Button>
      <Button mode="contained" onPress={resendOtp} style={styles.button} labelStyle={styles.buttonLabel}>
        Resend OTP
      </Button>
    </View>
  )

  return (
    <ImageBackground source={{ uri: "https://example.com/background-image.jpg" }} style={styles.backgroundImage}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.formCard}>
          <Card.Content>
            <Title style={styles.title}>Driver Registration</Title>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {loading && <ActivityIndicator animating={true} style={styles.loader} color="#f7de02" />}
          </Card.Content>
        </Card>
        <Snackbar
          visible={!!error || !!success}
          onDismiss={() => {
            setError("")
            setSuccess("")
          }}
          duration={3000}
          style={error ? styles.errorSnackbar : styles.successSnackbar}
        >
          {error || success}
        </Snackbar>
      </ScrollView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  formCard: {
    borderRadius: 15,
    elevation: 5,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#f7de02",
  },
  stepContainer: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
    backgroundColor: "white",
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: "#f7de02",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  card: {
    marginBottom: 20,
    borderRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f7de02",
  },
  cardParagraph: {
    fontSize: 16,
    marginBottom: 5,
  },
  loader: {
    marginTop: 20,
  },
  errorSnackbar: {
    backgroundColor: "#ff6961",
  },
  successSnackbar: {
    backgroundColor: "#77dd77",
  },
})

