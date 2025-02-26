import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';

const TokenContext = createContext();

export const TokenProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const loadToken = async () => {
            try {
                const storedToken = await SecureStore.getItemAsync('userToken');
                if (storedToken) {
                    setToken(storedToken);
                    setIsLoggedIn(true);
                }
            } catch (error) {
                console.error('Failed to load token:', error);
            }
        };

        loadToken();
    }, []);

    const updateToken = async (newToken) => {
        try {
            await SecureStore.setItemAsync('userToken', newToken);
            setToken(newToken);
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Failed to save token:', error);
        }
    };

    const logout = async () => {
        try {
            await SecureStore.deleteItemAsync('userToken');
            setToken(null);
            setIsLoggedIn(false); // ✅ Ensure logout state is updated
        } catch (error) {
            console.error('Failed to remove token:', error);
        }
    };

    return (
        <TokenContext.Provider value={{ token, isLoggedIn, updateToken, logout }}>
            {children}
        </TokenContext.Provider>
    );
};

export const useToken = () => {
    return useContext(TokenContext);
};
