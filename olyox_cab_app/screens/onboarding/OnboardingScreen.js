import { useState } from "react"
import { View, StyleSheet, Alert ,Platform} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import BackButton from "../../components/BackButton"
import OnboardingWelcome from "./OnboardingWelcome"
import RegistrationForm from "./registration/RegistrationForm"
import LoginForm from "./Login/LoginForm"
import OtpScreen from "./OtpScreen"
import axios from 'axios'
const OnboardingScreen = () => {
  const [currentScreen, setCurrentScreen] = useState("onboarding")
  const [loginNumber,setLoginNumber] =useState('')
  const [registrationStep, setRegistrationStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "a",
    email: "a",
    phone: "99",
    address: "a",
    bikeDetails: {
      make: "a",
      model: "a",
      year: "a",
      licensePlate: "s",
    },
    documents: {
      license: null,
      insurance: null,
      registration: null,
    },
    additionalInfo: "",
    assets: []
  })

  const handleInputChange = (field, value) => {
    setFormData((prevState) => ({
      ...prevState,
      [field]: value,
    }))
  }

  const handleBikeDetailsChange = (field, value) => {
    setFormData((prevState) => ({
      ...prevState,
      bikeDetails: {
        ...prevState.bikeDetails,
        [field]: value,
      },
    }))
  }

  const handleDocumentUpload = (documentType, form_assets, uri) => {
    console.log(form_assets)
    setFormData((prevState) => ({
      ...prevState,
      documents: {
        ...prevState.documents,
        [documentType]: uri,
      },
      assets: prevState.assets ? [...prevState.assets, form_assets] : [form_assets],
    }))
  }

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.name && formData.email && formData.phone && formData.address
      case 2:
        return (
          formData.bikeDetails.make &&
          formData.bikeDetails.model &&
          formData.bikeDetails.year &&
          formData.bikeDetails.licensePlate
        )
      case 3:
        return formData.documents.license && formData.documents.insurance && formData.documents.registration
      default:
        return false
    }
  }

  const handleNextStep = async () => {
    if (validateStep(registrationStep)) {
      if (registrationStep < 3) {
        setRegistrationStep(registrationStep + 1)
      } else {
        await handleSubmit()
      }
    } else {
      Alert.alert("Error", "Please fill in all required fields.")
    }
  }

  const handlePrevStep = () => {
    if (registrationStep > 1) {
      setRegistrationStep(registrationStep - 1)
    } else {
      setCurrentScreen("onboarding")
    }
  }


  const handleSubmit = async () => {
    if (!formData) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
  
    // Prepare the assets as a buffer (base64 encoding or as file data)
    const assetsBuffer = formData.assets.map(asset => {
      const normalizedUri = normalizeUri(asset.uri); // Normalize the URI as needed
  
      // If you want to convert the file into base64, you can use the following (or similar methods for your assets)
      // NOTE: You may need to use libraries such as `react-native-fs` for file reading to convert to buffer or base64
  
      return {
        uri: normalizedUri,
        type: asset.mimeType || 'image/jpeg', // default mime type if none
        name: asset.fileName || `image_${Date.now()}.jpeg`, // name for file
        buffer: asset.uri // Convert URI to base64 or Buffer here if needed
      };
    });
  
    // Create a new formData-like object to send in the POST request
    const dataToSend = {
      ...formData, // other form fields
      assets: JSON.stringify(assetsBuffer), // serialize assets as JSON
    };
  
    try {
      const response = await axios.post(
        'http://192.168.1.9:9630/api/v1/parcel/register_parcel_partner',
        dataToSend,
        {
          headers: {
            'Content-Type': 'application/json', // send as JSON payload
          },
          withCredentials: true,
        }
      );
  
      console.log(response.data);
    } catch (error) {
      if (error.response) {
        console.error('Error Response:', error.response);
        Alert.alert("Error", error.response.data.message);
      } else if (error.request) {
        console.error('Error Request:', error.request);
        Alert.alert("Error", "Network Error - No response from server.");
      } else {
        console.error('Error Message:', error.message);
        Alert.alert("Error", error.message);
      }
    }
  };
  
  // Normalize URI (this function should be customized for your needs)
  const normalizeUri = (uri) => {
    if (uri && uri.startsWith('file:////')) {
      return 'file://' + uri.substring(7);  // Correct URI format
    }
    return uri;
  };
  
  


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#fff5f5", "#ffe3e3"]} style={styles.gradient}>
        {currentScreen !== "onboarding" && <BackButton onPress={handlePrevStep} />}
        <View style={styles.content}>
          {currentScreen === "onboarding" && (
            <OnboardingWelcome
              onRegister={() => setCurrentScreen("register")}
              onLogin={() => setCurrentScreen("login")}
            />
          )}
          {currentScreen === "register" && (
            <RegistrationForm
              step={registrationStep}
              formData={formData}
              onInputChange={handleInputChange}
              onBikeDetailsChange={handleBikeDetailsChange}
              onDocumentUpload={handleDocumentUpload}
              onNextStep={handleNextStep}
              onPrevStep={handlePrevStep}
            />
          )}
          {currentScreen === "login" && <LoginForm onLogin={(number)=>{
           setLoginNumber(number)
           setCurrentScreen("otp")
          }} />        }
          {currentScreen === "otp" && <OtpScreen number={loginNumber}  onVerify={() => setCurrentScreen("onboarding")} />}
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
})

export default OnboardingScreen

