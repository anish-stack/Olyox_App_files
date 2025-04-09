import React, { useMemo } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

const OtpModal = React.memo(({ appState, updateState, handleOtpSubmit,update,riderDetails }) => {
    return useMemo(() => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={appState.showOtpModal}
            onRequestClose={() => updateState({ showOtpModal: false })}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>Enter OTP</Text>
                    <Text style={styles.description}>
                        Please enter the OTP provided by the rider to start the trip
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter OTP"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={appState.otp}
                        onChangeText={(text) => updateState({ otp: text })}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => updateState({ showOtpModal: false })}
                        >
                            <Text>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.verifyButton}
                            onPress={()=>handleOtpSubmit()}
                        >
                            <Text style={styles.verifyText}>Verify</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    ), [appState.showOtpModal, appState.otp]);
});

// Styles
const styles = {
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContainer: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20
    },
    description: {
        textAlign: 'center',
        marginBottom: 20
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 20,
        paddingHorizontal: 15,
        fontSize: 18,
        textAlign: 'center'
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between'
    },
    cancelButton: {
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        width: '45%',
        alignItems: 'center'
    },
    verifyButton: {
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        width: '45%',
        alignItems: 'center'
    },
    verifyText: {
        color: 'white',
        fontWeight: 'bold'
    }
};

export default OtpModal;
