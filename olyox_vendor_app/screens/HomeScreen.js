import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import PaperExample from '../components/PaperExample';
import ExampleComponent from '../components/ExampleComponent';

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <Text style={styles.text}>Welcome to the Home Screen!</Text>
        <ExampleComponent/>
        <PaperExample />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  text: {
    color: COLORS.text,
    fontSize: 18,
  },
});

export default HomeScreen;

