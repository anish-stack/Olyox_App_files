import { View, Text } from 'react-native'
import React from 'react'
import ShowMap from './ShowMap'
import { useRoute } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Show_Cabs() {
    const route = useRoute()
    const { data } = route.params || {}
    console.log(data)
    return (
       <SafeAreaView>
         <View>
            <Text>Show_Cabs</Text>
            <ShowMap data={data} />
        </View>
       </SafeAreaView>
    )
}