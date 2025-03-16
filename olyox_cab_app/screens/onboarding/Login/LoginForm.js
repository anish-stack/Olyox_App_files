import { useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import Input from "../../../components/Input";
import Button from "../../../components/Button";
import axios from "axios";

const LoginForm = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [phone, setPhone] = useState("");

    const handleLogin = async () => {
        if (!phone.trim()) {
            setError("Phone number is required");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const response = await axios.post(
                "https://demoapi.olyox.com/api/v1/parcel/login_parcel_partner",
                { number: phone }
            );
            console.log("response", response.data);

            if (response.data.success) {
                console.log("Login successful", response.data);
                onLogin(phone);
            } else {
                setError(response.data.message || "Login failed");
            }
        } catch (error) {
            const errorMessage = error?.response?.data?.message || "Something went wrong!";
            setError(errorMessage);
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button title={loading ? "Sending..." : "Send OTP"} onPress={handleLogin} style={styles.button} disabled={loading} />

            {loading && <ActivityIndicator size="large" color="#e51e25" style={styles.loader} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        padding: 20,
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
    loader: {
        marginTop: 10,
    },
    errorText: {
        color: "red",
        marginTop: 10,
    },
});

export default LoginForm;
