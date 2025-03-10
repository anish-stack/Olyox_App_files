
import { useState, useRef } from "react"
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { TextInput, Button, Text, Title, HelperText, RadioButton, Portal, Dialog } from "react-native-paper"
import { SafeAreaView } from "react-native-safe-area-context"
import axios from "axios"
import * as SecureStore from 'expo-secure-store';
import { FontAwesome } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"

const PARTNER_TYPES = [
  { label: "Parcel", value: "parcel" },

]

export default function ImprovedRegistrationForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    bikeDetails: { make: "", model: "", year: "", licensePlate: "" },
    type: "",
  })
  const navigation = useNavigation()

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [otpModalVisible, setOtpModalVisible] = useState(false)
  const [otp, setOtp] = useState("")

  const inputRefs = {
    name: useRef(),
    phone: useRef(),
    address: useRef(),
    make: useRef(),
    model: useRef(),
    year: useRef(),
    licensePlate: useRef(),
  }

  const validate = (currentStep) => {
    const tempErrors = {}
    if (currentStep === 1) {
      tempErrors.name = formData.name ? "" : "Name is required"
      tempErrors.phone = formData.phone.match(/^[0-9]{10}$/) ? "" : "Invalid phone number"
      tempErrors.address = formData.address ? "" : "Address is required"
    } else {
      tempErrors["bikeDetails.make"] = formData.bikeDetails.make ? "" : "Bike Company Name is required"
      tempErrors["bikeDetails.model"] = formData.bikeDetails.model ? "" : "Bike model is required"
      tempErrors["bikeDetails.year"] = formData.bikeDetails.year ? "" : "Bike purchase year is required"
      tempErrors["bikeDetails.licensePlate"] = formData.bikeDetails.licensePlate
        ? ""
        : "Vehicle License plate is required"
      tempErrors.type = formData.type ? "" : "Partner type is required"
    }
    setErrors(tempErrors)
    return Object.values(tempErrors).every((x) => x === "")
  }

  const handleChange = (name, value) => {
    if (name.includes("bikeDetails.")) {
      const key = name.split(".")[1]
      setFormData({ ...formData, bikeDetails: { ...formData.bikeDetails, [key]: value } })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleNext = () => {
    if (validate(1)) {
      setStep(2)
      setErrorMessage("")
    } else {
      setErrorMessage("Please fill in all required fields correctly")
    }
  }

  const handleBack = () => {
    setStep(1)
    setErrorMessage("")
  }

  const handleSubmit = async () => {
    if (validate(2)) {
      setLoading(true)
      try {
        const response = await axios.post("http://192.168.1.8:3100/api/v1/parcel/register_parcel_partner", formData)
        setOtpModalVisible(true)
      } catch (error) {
        console.log(error)
        alert(error?.response?.data?.message)

        setErrorMessage(error.response?.data?.message || "Registration Failed. Please try again.")
      } finally {
        setLoading(false)
      }
    } else {
      setErrorMessage("Please fill in all required fields correctly")
    }
  }

  const handleVerifyOtp = async () => {
    try {
      // Add OTP verification API call here
      const response = await axios.post("http://192.168.1.8:3100/api/v1/parcel/login_parcel_otp_verify", {
        number: formData.phone,
        otp,
      })
      console.log(response.data)
      if (response.data.success) {
        setOtpModalVisible(false)
        const { token } = response.data
        await SecureStore.setItemAsync('auth_token_partner', token)
        setFormData({
          name: "",
          phone: "",
          address: "",
          bikeDetails: { make: "", model: "", year: "", licensePlate: "" },
          type: "",
        })
        setErrorMessage("")
        alert("Registration Successful!")
        navigation.navigate('upload_images', { token: token })
      }
      // setOtpModalVisible(false)
      // // Reset form and show success message

      // setStep(1)


    } catch (error) {
      console.log(error)
      alert(error?.response?.data?.message)
      setErrorMessage("OTP verification failed. Please try again.")
    }
  }

  const handleResendOtp = async () => {
    try {
      // Add resend OTP API call here
      await axios.post("http://192.168.1.8:3100/api/v1/parcel/login_parcel_otp_resend", { number: formData.phone })
      alert("OTP resent successfully")
    } catch (error) {
      console.log(error)
      alert(error.response.data.message)
      setErrorMessage("Failed to resend OTP. Please try again.")
    }
  }

  const renderInput = (label, name, options = {}) => (
    <View style={styles.inputContainer}>
      <TextInput
        label={label}
        value={name.includes("bikeDetails.") ? formData.bikeDetails[name.split(".")[1]] : formData[name]}
        onChangeText={(val) => handleChange(name, val)}
        error={!!errors[name]}
        style={styles.input}
        mode="outlined"
        outlineColor="#FF6B6B"
        activeOutlineColor="#FF3333"
        ref={inputRefs[name.split(".")[1] || name]}
        onSubmitEditing={() => {
          const inputs = Object.keys(inputRefs)
          const currentIndex = inputs.indexOf(name.split(".")[1] || name)
          const nextInput = inputs[currentIndex + 1]
          if (nextInput && inputRefs[nextInput].current) {
            inputRefs[nextInput].current.focus()
          }
        }}
        left={<TextInput.Icon icon={() => <FontAwesome name={options.icon} size={24} color="#FF6B6B" />} />}
        {...options}
      />
      <HelperText type="error" visible={!!errors[name]}>
        {errors[name]}
      </HelperText>
    </View>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Title style={styles.title}>Partner Registration</Title>

          {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

          {step === 1 ? (
            <>
              {renderInput("Name", "name", { autoFocus: true, icon: "user" })}
              {renderInput("Phone", "phone", { keyboardType: "phone-pad", icon: "phone" })}
              {renderInput("Address", "address", { icon: "map-marker" })}
              <Button mode="contained" onPress={handleNext} style={styles.button}>
                Next
              </Button>
            </>
          ) : (
            <>
              {renderInput("Bike Company", "bikeDetails.make", { icon: "motorcycle" })}
              {renderInput("Bike Model", "bikeDetails.model", { icon: "info-circle" })}
              {renderInput("Purchase Year", "bikeDetails.year", { keyboardType: "numeric", icon: "calendar" })}
              {renderInput("License Plate", "bikeDetails.licensePlate", { icon: "id-card" })}
              <View style={styles.radioContainer}>
                <Text style={styles.radioLabel}>Partner Type</Text>
                <RadioButton.Group onValueChange={(value) => handleChange("type", value)} value={formData.type}>
                  {PARTNER_TYPES.map((type) => (
                    <View key={type.value} style={styles.radioButton}>
                      <RadioButton.Item label={type.label} value={type.value} color="#FF3333" />
                    </View>
                  ))}
                </RadioButton.Group>
                <HelperText type="error" visible={!!errors.type}>
                  {errors.type}
                </HelperText>
              </View>
              <View style={styles.buttonContainer}>
                <Button mode="outlined" onPress={handleBack} style={[styles.button, styles.backButton]}>
                  Back
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[styles.button, styles.submitButton]}
                  disabled={loading}
                  loading={loading}
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={otpModalVisible} onDismiss={() => setOtpModalVisible(false)}>
          <Dialog.Title>Enter OTP</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
              style={styles.otpInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleResendOtp}>Resend OTP</Button>
            <Button onPress={handleVerifyOtp}>Verify</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
    textAlign: "center",
    color: "#FF3333",
    fontSize: 28,
    fontWeight: "bold",
  },
  errorMessage: {
    color: "#FF3333",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#FFF",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    paddingVertical: 8,
    flex: 1,
  },
  backButton: {
    marginRight: 10,
    borderColor: "#FF3333",
  },
  submitButton: {
    marginLeft: 10,
    backgroundColor: "#FF3333",
  },
  radioContainer: {
    marginTop: 10,
  },
  radioLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: "#FF3333",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  otpInput: {
    marginTop: 10,
  },
})

