import { StyleSheet, Dimensions } from "react-native"

const { width, height } = Dimensions.get("window")

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#B5100C",
  },
  mapContainer: {
    height: height * 0.4,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "#B5100C",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor: "#B5100C",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#FF6600",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  driverMarker: {
    backgroundColor: "#FFF",
    padding: 5,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#FF6600",
  },
  locationMarker: {
    backgroundColor: "#FFF",
    padding: 5,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#333",
  },
  orderInfo: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  orderInfoStatus: {
    fontSize: 16,
    color: "#FF6600",
    marginTop: 5,
  },
  locationInfo: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 10,
    marginTop: 2,
  },
  parcelInfo: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  parcelInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  parcelInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  parcelInfoLabel: {
    fontSize: 14,
    color: "#666",
  },
  parcelInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  tripInfo: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  tripInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  tripInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  tripInfoLabel: {
    fontSize: 14,
    color: "#666",
  },
  tripInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  deliveredMessageContainer: {
    backgroundColor: "#d4edda", // Light green background
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#155724", // Dark green border
  },
  deliveredMessage: {
    color: "#155724", // Dark green text
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButton: {
    backgroundColor: "#B5100C",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  actionButtonsContainer: {
    padding: 16,
  },
  markReachedButton: {
    backgroundColor: "#B5100C",
  },
  startRideButton: {
    backgroundColor: "#FF6600",
  },
  deliveredButton: {
    backgroundColor: "#B5100C",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Transparent black background
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  paymentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    marginHorizontal: 5,
  },
  selectedPayment: {
    backgroundColor: "#0d6efd", // Blue color for selected payment mode
  },
  buttonText: {
    color: "#333",
    fontWeight: "bold",
  },
})

export default styles

