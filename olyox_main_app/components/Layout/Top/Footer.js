import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useSettings from '../../../hooks/Settings';

const Footer = () => {
    const {settings} = useSettings()
    const socialLinks = [
        { icon: 'facebook', url: settings?.fbUrl ||'https://facebook.com'  },
        { icon: 'twitter', url: settings?.twitterUrl || 'https://twitter.com' },
        { icon: 'instagram', url: settings?.instagramUrl ||'https://instagram.com' },

    ];

    const handleSocialLink = (url) => {
        Linking.openURL(url);
    };

    return (
        <LinearGradient
            colors={['#d53333', '#cb0000', '#db4d4d']}
            style={styles.footer}
        >
            <View style={styles.socialContainer}>
                {socialLinks.map((social, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.socialButton}
                        onPress={() => handleSocialLink(social.url)}
                    >
                        <FontAwesome name={social.icon} size={24} color="#fff" />
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.copyright}>
                © {new Date().getFullYear()} Olyox. All rights reserved.
            </Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    footer: {
      
      
        padding: 20,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
    },
    socialContainer: {
        
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 15,
    },
    socialButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    copyright: {
        color: '#fff',
        textAlign: 'center',
        opacity: 0.8,
        fontSize: 12,
    },
});

export default Footer;