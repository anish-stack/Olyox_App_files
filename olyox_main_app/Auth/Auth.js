import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useClerk, useOAuth, useUser } from '@clerk/clerk-expo';
import { tokenCache } from './cache'; // Import your tokenCache utility
import { useNavigation } from '@react-navigation/native';

export const useWarmUpBrowser = () => {
    React.useEffect(() => {
        const warmUp = async () => {
            await WebBrowser.warmUpAsync();
        };
        warmUp();
        return () => {
            WebBrowser.coolDownAsync();
        };
    }, []);
};

export const signUpSignIn = async (navigation) => {
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
    const { signOut, setActive } = useClerk();
    const { user } = useUser();

    // Handle logout
    const handleLogout = async () => {
        try {
            // Clear the Clerk session
            await signOut();
            console.log('User logged out');
            navigation.navigate('Login'); // Redirect to Login screen or handle accordingly
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    // Warm up the browser session (only necessary for some platforms)
    useWarmUpBrowser();

    // Function to handle Google OAuth flow
    const handleGoogleOAuth = React.useCallback(async () => {
        try {
            const response = await startOAuthFlow({
                redirectUrl: Linking.createURL('/Home', { scheme: 'myapp' }),
            });

            const { signUp, signIn } = response;

            // Check if the user is signing in
            if (signIn && signIn.status === 'complete') {
                console.log('User already exists, logging in...');

                const { createdSessionId } = signIn;
                if (createdSessionId) {
                    console.log('Session created successfully:', createdSessionId);

                    // Set the active session using Clerk's setActive method
                    await setActive({ session: createdSessionId });
                    await tokenCache.saveToken('auth_token', createdSessionId);
                    console.log('Session has been set as active');

                    navigation.navigate('Home'); // Redirect to Home after login
                } else {
                    console.error('No session ID returned during login');
                }
            } 
            // If it's a new user, proceed with the sign-up flow
            else if (signUp) {
                console.log('New user detected, proceeding with sign-up...');

                // Handle missing fields, for example, phone number
                if (signUp.status === 'missing_requirements') {
                    console.warn('Missing required fields:', signUp.missingFields);
                    if (signUp.missingFields.includes('phone_number')) {
                        console.log('Requesting phone number...');
                        await signUp.update({
                            phoneNumber: '7217619794', // Replace with actual user input
                        });
                    }
                }

                // Complete the sign-up and create the session
                const { createdSessionId } = signUp;
                if (createdSessionId) {
                    console.log('Session created successfully:', createdSessionId);

                    // Set the active session using Clerk's setActive method
                    await setActive({ session: createdSessionId });
                    await tokenCache.saveToken('auth_token', createdSessionId);
                    console.log('Session has been set as active');

                    // Navigate to the Home screen
                    navigation.navigate('Home');
                } else {
                    console.error('No session ID returned during sign-up');
                }
            }
        } catch (err) {
            console.error('Error during Google sign-up or login:', JSON.stringify(err, null, 2));
        }
    }, [startOAuthFlow, setActive, navigation]);

    // Return the function to be called from components
    return { handleGoogleOAuth, handleLogout };
};
