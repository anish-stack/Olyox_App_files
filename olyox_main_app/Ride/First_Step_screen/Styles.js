import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginLeft: 16,
        color: '#333',
    },
    card: {
        margin: 16,
        flex: 1,
    },
    locationCard: {
        backgroundColor: 'white',
        borderRadius: 5,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    inputsContainer: {
        position: 'relative',
    },
    inputWrapper: {
        marginVertical: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    inputContent: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 8,
        marginLeft: 24,
    },
    loaderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loaderText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    },
    suggestionsContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginTop: 16,
        maxHeight: 300,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionPressed: {
        backgroundColor: '#f5f5f5',
    },
    suggestionText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    submitButton: {
        backgroundColor: COLORS.zom,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        shadowColor: COLORS.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    submitIcon: {
        marginRight: 8,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});
export default styles;