import { View, Text } from 'react-native'
import React from 'react'
import MapView from 'react-native-maps';
export default function Map() {
  return (
    <View >
      <Text>map</Text>
      <MapView zoomControlEnabled  style={{height:400,width:400}}/>
    </View>
  )
}