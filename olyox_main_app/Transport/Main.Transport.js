import { View, Text } from 'react-native'
import React from 'react'
import Layout from '../components/Layout/_layout'
import Parcel_Transport from './Parcel_Transport/Parcel_Transport'

export default function MainTransport() {
    return (
        <Layout  isHeaderShown={false}>

            <View style={{flex:1}}>
                <Parcel_Transport/>

                <Text>Main.Transport</Text>

            </View>
        </Layout>
    )
}