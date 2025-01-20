import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Create a token cache utility
const createTokenCache = () => {
    return {
        // Get a token from Secure Store
        getToken: async (key) => {
            try {
                const item = await SecureStore.getItemAsync(key);
                if (item) {
                    console.log(`${key} was used 🔐 \n`);
                } else {
                    console.log('No values stored under key: ' + key);
                }
                return item;
            } catch (error) {
                console.error('Secure store get item error: ', error);
                // Delete the item if there was an error
                await SecureStore.deleteItemAsync(key);
                return null;
            }
        },

        // Save a token to Secure Store
        saveToken: (key, token) => {
            return SecureStore.setItemAsync(key, token);
        },

        // Delete a token from Secure Store
        deleteToken: async (key) => {
            try {
                await SecureStore.deleteItemAsync(key);
                console.log(`${key} deleted 🔐`);
            } catch (error) {
                console.error('Secure store delete item error: ', error);
            }
        },
    };
};

// Only use SecureStore for non-web platforms
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;
