import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../constants/colors';
import Layout from '../components/Layout/_layout';
import Status from '../components/Status/Status';
import OrderCount from '../components/OrderCount/OrderCount';
import Graph from '../components/Graph/Graph';

const HomeScreen = () => {
  return (
    <Layout>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Status />
        <OrderCount />
        <Graph />
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
});

export default HomeScreen;
