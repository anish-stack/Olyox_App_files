import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Switch } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AllCustomTiffins = () => {
  const navigation = useNavigation();
  const [allCustomTiffins, setAllCustomTiffins] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleFetchTiffin = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      if (!storedToken) {
        navigation.replace('Login');
        return;
      }
      const { data } = await axios.get('http://192.168.11.251:3000/api/v1/tiffin/get_custom_tiffin_by_resutrant_id',{
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      });
      const allData = data.data;
      const reverse = allData.reverse();
      setAllCustomTiffins(reverse);
    } catch (error) {
      console.log("Internal server error", error);
      Alert.alert('Error', 'Failed to fetch tiffin data');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    handleFetchTiffin().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    handleFetchTiffin();
  }, []);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Tiffin Plan',
      'Are you sure you want to delete this tiffin plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`http://192.168.11.251:3000/api/v1/tiffin/delete_custom_tiffin/${id}`);
              handleFetchTiffin();
              Alert.alert('Success', 'Tiffin plan deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete tiffin plan');
            }
          }
        }
      ]
    );
  };

  const handleUpdateTiffinAvailability = async (id, food_availability) => {
    try {
      const updated = !food_availability;
      const response = await axios.put(`http://192.168.11.251:3000/api/v1/tiffin/update_tiffin_availability/${id}`, { food_availability: updated });
      if (response.status === 200) {
        handleFetchTiffin();
        Alert.alert('Success', 'Tiffin availability updated successfully');
      }
    } catch (error) {
      console.log("Internal server error", error)
    }
  }

  const handleUpdate = (tiffin) => {
    Alert.alert('Update', 'Update functionality to be implemented');
  };

  const MealSection = ({ title, meal, icon }) => {
    if (!meal?.enabled || !meal?.items?.length) return null;

    return (
      <View style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <Icon name={icon} size={24} color="#1976D2" />
          <Text style={styles.mealTitle}>{title}</Text>
        </View>
        {meal.items.map((item, index) => (
          <View key={index} style={styles.mealItem}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTiffinCard = (tiffin) => (
    <View key={tiffin._id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.durationBadge}>
          <Icon name="calendar-clock" size={20} color="#1976D2" />
          <Text style={styles.durationText}>{tiffin.duration} Days Plan</Text>
        </View>
        <Text style={styles.totalPrice}>₹{tiffin.totalPrice}</Text>
      </View>

      <View style={styles.preferencesContainer}>
        <View style={styles.preferenceBadge}>
          <Icon
            name={tiffin.preferences.isVeg ? "leaf" : "food"}
            size={16}
            color={tiffin.preferences.isVeg ? "#4CAF50" : "#FF9800"}
          />
          <Text style={styles.preferenceText}>
            {tiffin.preferences.isVeg ? "Veg" : "Non-Veg"}
          </Text>
        </View>
        <View style={styles.preferenceBadge}>
          <Icon name="fire" size={16} color="#F44336" />
          <Text style={styles.preferenceText}>
            {tiffin.preferences.spiceLevel.charAt(0).toUpperCase() +
              tiffin.preferences.spiceLevel.slice(1)} Spice
          </Text>
        </View>
        <View style={styles.preferenceBadge}>
          <Icon
            name={tiffin.preferences.includeWeekends ? "calendar-check" : "calendar-remove"}
            size={16}
            color="#673AB7"
          />
          <Text style={styles.preferenceText}>
            {tiffin.preferences.includeWeekends ? "Includes" : "Excludes"} Weekends
          </Text>
        </View>
      </View>

      <View style={styles.mealsContainer}>
        <MealSection
          title="Breakfast"
          meal={tiffin.meals.breakfast}
          icon="coffee-outline"
        />
        <MealSection
          title="Lunch"
          meal={tiffin.meals.lunch}
          icon="food-outline"
        />
        <MealSection
          title="Dinner"
          meal={tiffin.meals.dinner}
          icon="food-turkey"
        />
      </View>

      <View style={styles.cardActions}>
        {/* <TouchableOpacity 
          style={[styles.actionButton, styles.updateButton]}
          onPress={() => handleUpdate(tiffin)}
        >
          <Icon name="pencil" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Update</Text>
        </TouchableOpacity> */}
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityText}>{tiffin.food_availability ? 'Available' : 'Unavailable'}</Text>
          <Switch
            value={tiffin.food_availability}
            onValueChange={() => handleUpdateTiffinAvailability(tiffin._id, tiffin.food_availability)}
          />
        </View>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(tiffin._id)}
        >
          <Icon name="delete" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Custom Tiffin Plans</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Customize Tiffine Plan')} style={styles.addButton}>
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {allCustomTiffins.map(renderTiffinCard)}
      </ScrollView>
    </View>
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
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  durationText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 14,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  preferencesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  preferenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  preferenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  mealsContainer: {
    gap: 16,
  },
  mealSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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

export default AllCustomTiffins;