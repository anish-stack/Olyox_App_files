import { View, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { Audio } from 'expo-av'; // Import Audio from expo-av

export default function RideCome() {
    const { socket, isSocketReady } = useSocket(); // Destructure socket and readiness state
    const [rideData, setRideData] = useState(null);
    const [sound, setSound] = useState(); // State to store the sound object

    useEffect(() => {
        if (isSocketReady && socket) {
            // Listen for the 'ride_come' event from the server
            socket.on('ride_come', (data) => {
                console.log('Received ride data:', data);

                // Set the received ride data into the state
                setRideData(data);

                // Play sound when ride data comes
                playSound();
            });

            // Cleanup the listener on component unmount
            return () => {
                socket.off('ride_come');
            };
        }
    }, [isSocketReady, socket]); // Only run effect when socket is ready

    // Function to play sound
    const playSound = async () => {
        const { sound } = await Audio.Sound.createAsync(
            require('./taxi.mp3'), {
            shouldPlay: true,
            isLooping: true
        } 
        );

        setSound(sound);

        await sound.playAsync(); // Play the sound
    };

    return (
        <ScrollView style={{ padding: 16 }}>
            {rideData ? (
                <View>
                    {/* Ride Request Section */}
                    <Card style={{ marginBottom: 16 }}>
                        <Card.Title title="Ride Request" />
                        <Card.Content>
                            <Text variant="headlineSmall">Pickup Location:</Text>
                            <Text>{rideData.pickup_desc}</Text>
                            <Divider style={{ marginVertical: 8 }} />
                            <Text variant="headlineSmall">Drop Location:</Text>
                            <Text>{rideData.drop_desc}</Text>
                        </Card.Content>
                    </Card>

                    {/* Action Button */}
                    <Button mode="contained" onPress={() => console.log('Ride Accepted')}>
                        Accept Ride
                    </Button>
                </View>
            ) : (
                <Card>
                    <Card.Content>
                        <Text>Waiting for ride data...</Text>
                    </Card.Content>
                </Card>
            )}
        </ScrollView>
    );
}
