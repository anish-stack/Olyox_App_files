import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ec363f",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ec363f",
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
    top: 40,
  },
  suggestionItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
    backgroundColor: "#ec363f",
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
});