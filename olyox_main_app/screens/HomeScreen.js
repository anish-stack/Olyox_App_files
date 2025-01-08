import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import PaperExample from '../components/PaperExample';
import ExampleComponent from '../components/ExampleComponent';
import Layout from '../components/Layout/_layout';
import OfferBanner from '../components/OfferBanner/OfferBanner';
import Categories from '../components/Categories/Categories';
import Top_Hotel from '../Hotels/Top_Hotel/Top_Hotel';
import TopFood from '../Foods/Top_Foods/TopFood';
import BookARide from '../components/Book_A_Ride/BookARide';

const HomeScreen = () => {
  return (
    <Layout >
      <ScrollView>
        <OfferBanner />
        <Categories />
        <BookARide/>
        <Top_Hotel />
        <TopFood/>
      </ScrollView>
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

