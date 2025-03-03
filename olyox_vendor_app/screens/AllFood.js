import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { Switch } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AllFood = () => {
  const navigation = useNavigation();
  const [allFood, setAllFood] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleFetchFood = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (!storedToken) {
        navigation.replace('Login');
        return;
      }
      const { data } = await axios.get(
        'http://192.168.1.3:3000/api/v1/tiffin/get_food_by_resutrant_id', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      }
      );
      const allData = data.data;
      const reverse = allData.reverse();
      setAllFood(reverse);
    } catch (error) {
      console.log('Internal server error', error);
      Alert.alert('Error', 'Failed to fetch food items');
    }
  };

  useEffect(() => {
    handleFetchFood();
  }, [navigation]);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Food',
      'Are you sure you want to delete this food item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Replace with your actual delete API endpoint
              await axios.delete(`http://192.168.1.3:3000/api/v1/tiffin/delete_tiffin_listing/${id}`);
              handleFetchFood(); // Refresh the list
              Alert.alert('Success', 'Food item deleted successfully');
            } catch (error) {
              console.log('Delete error:', error);
              Alert.alert('Error', 'Failed to delete food item');
            }
          },
        },
      ]
    );
  };

  const handleUpdate = (item) => {
    // Navigate to update screen or show update modal
    Alert.alert('Update', 'Update functionality to be implemented');
  };

  const handleUpdateFoodAvailableStatus = async (id, food_availability) => {
    try {
      const updatedStatus = !food_availability;
      const res = await axios.put(`http://192.168.1.3:3000/api/v1/tiffin/update_available_food_status/${id}`, { food_availability: updatedStatus });
      if (res.data.success) {
        Alert.alert('Success', 'Food item availability updated successfully');
        handleFetchFood();
      }
    } catch (error) {
      console.log("Internal server error", error)
    }
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    handleFetchFood().finally(() => setRefreshing(false));
  }, []);

  const renderFoodItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item?.images?.url }}
        style={styles.image}
      />
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.foodName}>{item.food_name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.food_category}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.detailsRow}>
          <Text style={styles.price}>₹{item.food_price}</Text>
          <View style={styles.availabilityBadge}>
            <Icon
              name={item.food_availability ? 'check-circle' : 'close-circle'}
              size={16}
              color={item.food_availability ? '#4CAF50' : '#F44336'}
            />
            <Text style={[
              styles.availabilityText,
              { color: item.food_availability ? '#4CAF50' : '#F44336' }
            ]}>
              {item.food_availability ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.includes}>
          <Text style={styles.includesTitle}>Includes:</Text>
          {item.what_includes.map((include, index) => (
            <Text key={index} style={styles.includeItem}>• {include}</Text>
          ))}
        </View>

        <View style={styles.actions}>
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={() => handleUpdate(item)}
          >
            <Icon name="pencil" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity> */}

          <View style={styles.availabilityRow}>
            <Text style={styles.availabilityText}>{item.food_availability ? 'Available' : 'Unavailable'}</Text>
            <Switch
              value={item.food_availability}
              onValueChange={() => handleUpdateFoodAvailableStatus(item._id, item.food_availability)}
            />
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item._id)}
          >
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food Menu</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Add Listing')} style={styles.addButton}>
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={allFood}
        renderItem={renderFoodItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 12,
  },
  description: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  includes: {
    marginBottom: 16,
  },
  includesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  includeItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  updateButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  availabilityText: { fontSize: 14, fontWeight: '600' },
});

export default AllFood;