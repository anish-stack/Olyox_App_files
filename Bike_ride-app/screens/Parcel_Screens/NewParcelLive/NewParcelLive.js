import { View, Text } from 'react-native'
import React from 'react'
import { useSocket } from '../../../context/SocketContext'

export default function NewParcelLive() {

    const { isSocketReady, socket } = useSocket()

    return (
        <View>
            <Text>{socket ? 'New Ride is Come For You ' : 'Not Connected To you'}</Text>
        </View>
    )
}