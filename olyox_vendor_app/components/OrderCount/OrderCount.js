import React from 'react';
import { Text, View, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function OrderCount() {
    const orderStats = [
        {
            title: 'New Orders',
            count: 25,
            icon: 'shopping-outline',
            color: '#FF6B6B',
            bgColor: '#FFE8E8'
        },
        {
            title: 'Running',
            count: 12,
            icon: 'run-fast',
            color: '#4ECDC4',
            bgColor: '#E8F8F7'
        },
        {
            title: 'Completed',
            count: 156,
            icon: 'check-circle-outline',
            color: '#45B7D1',
            bgColor: '#E6F6FA'
        },
        {
            title: 'Products',
            count: 48,
            icon: 'package-variant-closed',
            color: '#96C93D',
            bgColor: '#F0F7E6'
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.inner_container}>
                {orderStats.map((stat, index) => (
                    <View key={index} style={styles.col}>
                        <View style={[styles.statBox, { backgroundColor: stat.bgColor }]}>
                            <View style={[styles.iconContainer, { backgroundColor: stat.color }]}>
                                <Icon name={stat.icon} size={24} color="white" />
                            </View>
                            <Text style={styles.count}>{stat.count}</Text>
                            <Text style={styles.title}>{stat.title}</Text>
                            <View style={[styles.progressBar, { backgroundColor: stat.color + '40' }]}>
                                <View 
                                    style={[
                                        styles.progress, 
                                        { 
                                            backgroundColor: stat.color,
                                            width: `${Math.min((stat.count / 200) * 100, 100)}%`
                                        }
                                    ]} 
                                />
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingLeft: 16,
        paddingRight: 16,
    },
    inner_container: {
        width: '100%',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
    },
    col: {
        width: '48%',
        marginBottom: 16,
    },
    statBox: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    count: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    title: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    progressBar: {
        width: '100%',
        height: 4,
        borderRadius: 2,
    },
    progress: {
        height: '100%',
        borderRadius: 2,
    }
});