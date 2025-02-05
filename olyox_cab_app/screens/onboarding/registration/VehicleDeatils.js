import { View, StyleSheet } from "react-native"
import Input from "../../../components/Input"

const VehicleDetails = ({ formData, onInputChange }) => (
  <View style={styles.container}>
    <Input placeholder="Make" value={formData.make} onChangeText={(text) => onInputChange("make", text)} icon="car" />
    <Input
      placeholder="Model"
      value={formData.model}
      onChangeText={(text) => onInputChange("model", text)}
      icon="car-side"
    />
    <Input
      placeholder="Year"
      value={formData.year}
      onChangeText={(text) => onInputChange("year", text)}
      keyboardType="numeric"
      icon="calendar"
    />
    <Input
      placeholder="License Plate"
      value={formData.licensePlate}
      onChangeText={(text) => onInputChange("licensePlate", text)}
      icon="card-account-details"
    />
  </View>
)

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
})

export default VehicleDetails

