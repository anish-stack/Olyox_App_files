import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL_V1, API_BASE_URL_V3 } from '../../constant/Api';
import styles from './Styles';

const BhVerification = () => {
    const [bh, setBh] = useState('BH648624');
    const [name, setName] = useState('');
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const checkBhId = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data } = await axios.post(`${API_BASE_URL_V3}check-bh-id`, { bh });

            if (!data.success) {
                setLoading(false);
                return setError(data.message || 'Failed to validate BH ID.');
            }
            // console.log(data)
            setName(data.data);
            setResponse(data);

            // setTimeout(() => {
            //     navigation.navigate('Register', { bh_id: bh });
            // }, 2000);
        } catch (err) {
            setResponse(null);
            setError(err.response?.data?.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Image
                    source={{ uri: 'https://res.cloudinary.com/dlasn7jtv/image/upload/v1735719280/llocvfzlg1mojxctm7v0.png' }}
                    style={styles.logo}
                />

                <Text style={styles.title}>Enter Your BH ID</Text>
                <Text style={styles.subtitle}>Register at Olyox.com and start earning today</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter your BH ID"
                    value={bh}
                    onChangeText={setBh}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={checkBhId}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Verify BH ID</Text>
                    )}
                </TouchableOpacity>

                {response && (
                    <View style={styles.successBox}>
                        <Text style={styles.successText}>{response.message || 'BH ID verified successfully!'} Redirecting...</Text>
                    </View>
                )}

                {error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};



export default BhVerification;
