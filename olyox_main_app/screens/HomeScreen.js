import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import PaperExample from '../components/PaperExample';
import ExampleComponent from '../components/ExampleComponent';
import Layout from '../components/Layout/_layout';
import OfferBanner from '../components/OfferBanner/OfferBanner';
import Categories from '../components/Categories/Categories';

const HomeScreen = () => {
  return (
    <Layout>
      <OfferBanner/>
      <Categories/>


    </Layout>
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

