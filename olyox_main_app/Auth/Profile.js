import { View, Text } from 'react-native'
import React from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { useNavigation } from '@react-navigation/native'
export default function Profile() {
    const { isSignedIn } = useAuth()
const navigation = useNavigation()
    if (isSignedIn) {
      return  navigation.navigate('Profile')
    }
  return (
    <View>
      <Text>Profile</Text>
    </View>
  )
}