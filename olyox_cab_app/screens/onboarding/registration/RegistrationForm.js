import { View, Text, StyleSheet, ScrollView } from "react-native"
import BasicDetails from "./BasicDetails"
import VehicleDetails from "./VehicleDeatils"
import DocumentUpload from "./Document"
import StepIndicator from "../StepIndicator"
import Button from "../../../components/Button"

const RegistrationForm = ({
  step,
  formData,
  onInputChange,
  onBikeDetailsChange,
  onDocumentUpload,
  onNextStep,
  onPrevStep,
}) => {
  const renderStep = () => {
    switch (step) {
      case 1:
        return <BasicDetails formData={formData} onInputChange={onInputChange} />
      case 2:
        return <VehicleDetails formData={formData.bikeDetails} onInputChange={onBikeDetailsChange} />
      case 3:
        return <DocumentUpload documents={formData.documents} onUpload={onDocumentUpload} />
      default:
        return null
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register as Delivery Partner</Text>
      <StepIndicator currentStep={step} totalSteps={3} />
      {renderStep()}
      <View style={styles.buttonContainer}>
        {step > 1 && <Button title="Previous" onPress={onPrevStep} style={styles.button} />}
        <Button
          title={step === 3 ? "Submit" : "Next"}
          onPress={onNextStep}
          style={[styles.button, styles.nextButton]}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e51e25",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  nextButton: {
    backgroundColor: "#e51e25",
  },
})

export default RegistrationForm

