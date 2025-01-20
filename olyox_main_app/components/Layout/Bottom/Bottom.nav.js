import React from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Platform,
    Dimensions,
    Animated
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../../constants/colors';

const { width } = Dimensions.get('window');
const tabWidth = width / 5;

const BottomNav = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [selectedTab, setSelectedTab] = React.useState(0);
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    const tabs = [
        { name: 'Home', icon: '🏠', route: 'Home' },
        { name: 'Hotels', icon: '🏩', route: 'Hotels' },
        { name: 'Active Rides', icon: '🚘', route: 'Active Rides' },
        { name: 'Orders', icon: '🏷️', route: 'Orders' },
        { name: 'Profile', icon: '👤', route: 'Profile' },
    ];

    const handleTabPress = (index, tabRoute) => {
        Animated.sequence([
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        setSelectedTab(index);
        navigation.navigate(tabRoute);
    };

    const renderTab = (tab, index) => {
        const isActive = route.name.toLowerCase() === tab.route.toLowerCase();

        const scale = isActive ?
            animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.2, 1],
            }) : 1;

        return (
            <TouchableOpacity
                key={index}
                style={styles.tabItem}
                onPress={() => handleTabPress(index, tab.route)}
                activeOpacity={0.7}
            >
                <Animated.View
                    style={[
                        styles.tabContent,
                        isActive && styles.activeTabContent,
                        { transform: [{ scale }] }
                    ]}
                >
                    <Text style={styles.tabIcon}>{tab.icon}</Text>
                    <Text
                        style={[
                            styles.tabText,
                            isActive && styles.activeTabText,
                            Platform.select({
                                ios: styles.iosText,
                                android: styles.androidText,
                            })
                        ]}
                    >
                        {tab.name}
                    </Text>
                    {isActive && <View style={styles.activeIndicator} />}
                </Animated.View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[
            styles.bottomNav,
            Platform.select({
                ios: styles.iosNav,
                android: styles.androidNav,
            })
        ]}>
            {tabs.map((tab, index) => renderTab(tab, index))}
            <Animated.View
                style={[
                    styles.slider,
                    {
                        transform: [{
                            translateX: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [selectedTab * tabWidth, (selectedTab + 1) * tabWidth],
                            }),
                        }],
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingVertical: Platform.OS === 'ios' ? 20 : 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 12,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    iosNav: {
        borderTopWidth: 0,
    },
    androidNav: {
        borderTopWidth: 0,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 20,
    },
    activeTabContent: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    tabIcon: {
        fontSize: 13,
        marginBottom: 4,
    },
    tabText: {
        fontSize: 10,
        textAlign: 'center',
    },
    iosText: {
        fontWeight: '600',
    },
    androidText: {
        fontWeight: 'bold',
    },
    activeTabText: {
        color: COLORS.error,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -8,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.error,
    },
    slider: {
        position: 'absolute',
        top: 0,
        width: tabWidth,
        height: 2,
        backgroundColor: COLORS.error,
    }
});

export default BottomNav;