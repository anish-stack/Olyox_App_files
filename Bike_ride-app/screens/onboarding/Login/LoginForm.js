import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import axios from 'axios';
import { useNavigation } from "@react-navigation/native";

const LoginForm = ({ onLogin }) => {
    const [phone, setPhone] = useState("9638547963");
    const navigation = useNavigation()
    const handleLogin = async () => {
        try {
            // Make the Axios request to the login endpoint
            const response = await axios.post('https://demoapi.olyox.com/api/v1/rider/rider-login', { number: phone });

            if (response.data.success) {
                console.log("Login successful", response.data);
                onLogin(phone)

            } else {
                console.log("Login failed", response.data.message);
            }
        } catch (error) {

            if (error?.response?.status === 403) {

                Alert.alert('Complete Profile', error?.response?.data?.message, [{
                    text: 'OK',
                    onPress: () => navigation.navigate('register')
                }])

            } else if (error?.response?.status === 402) {
                Alert.alert('Profile Not Found', error?.response?.data?.message, [{
                    text: 'OK',
                    onPress: () => navigation.navigate('enter_bh')
                }])

            } else {
                Alert.alert('Error', error?.response?.data?.message)
            }
            console.error("Error during login:", error?.response?.status);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <Input
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                icon="phone"
            />
            <Button title="Send OTP" onPress={handleLogin} style={styles.button} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#e51e25",
        marginBottom: 20,
    },
    button: {
        marginTop: 20,
        minWidth: 200,
    },
});

export default LoginForm;
