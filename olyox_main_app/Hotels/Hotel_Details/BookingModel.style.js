import { StyleSheet } from "react-native"

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1a1a1a",
    },
    modalBody: {
        padding: 16,
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        marginBottom: 16,
    },
    dateTextContainer: {
        marginLeft: 12,
    },
    dateLabel: {
        fontSize: 12,
        color: "#666",
    },
    dateValue: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1a1a1a",
    },
    guestInfo: {
        fontSize: 12,
        color: "#666",
        marginBottom: 16,
    },
    guestItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    guestInputContainer: {
        flex: 2,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    guestInput: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 12,
        fontSize: 10,
        marginRight: 8,
    },
    addGuestButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        marginTop: 8,
    },
    addGuestText: {
        marginLeft: 8,
        color: "#de423e",
        fontWeight: "500",
    },
    errorText: {
        color: "#EF4444",
        fontSize: 14,
        marginTop: 8,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: "#1a1a1a",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    noteInput: {
        height: 100,
        textAlignVertical: "top",
    },
    paymentTitle: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1a1a1a",
        marginBottom: 16,
    },
    paymentOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        marginBottom: 12,
    },
    selectedPayment: {
        backgroundColor: "#FFE4E8",
    },
    paymentText: {
        marginLeft: 12,
        fontSize: 16,
        color: "#666",
    },
    selectedPaymentText: {
        color: "#de423e",
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    footerButtons: {
        flexDirection: "row",
        gap: 12,
    },
    nextButton: {
        backgroundColor: "#de423e",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    backButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#de423e",
    },
    submitButton: {
        flex: 2,
        backgroundColor: "#de423e",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: "#ccc",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    backButtonText: {
        color: "#de423e",
        fontSize: 16,
        fontWeight: "bold",
    },
})

export default styles

