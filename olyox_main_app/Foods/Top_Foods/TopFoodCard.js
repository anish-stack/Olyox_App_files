import React, { useState } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  Image, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StyleSheet } from 'react-native';

const DEFAULT_IMAGE = "https://i.ibb.co/rGcJwG34/Hotel-2.png";

export default function TopFoodCard({ restaurant, onPress }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const imageSource = {
    uri: imageError ? DEFAULT_IMAGE : 
         restaurant?.logo?.url && restaurant.logo.url !== "" ? 
         restaurant.logo.url : DEFAULT_IMAGE
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.7} 
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
        
        {imageLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#AA0000" />
          </View>
        )}

        {restaurant.restaurant_in_top_list && (
          <View style={styles.topPickBadge}>
            <Icon name="crown" size={12} color="#FFD700" />
            <Text style={styles.topPickText}>Top Pick</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {restaurant.restaurant_name}
        </Text>

        <View style={styles.infoRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {restaurant.restaurant_category}
            </Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>
              {restaurant.rating || "4.5"}
            </Text>
            <Icon name="star" size={12} color="#FFD700" />
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Icon name="clock-outline" size={12} color="#666" />
            <Text style={styles.detailText}>
              {restaurant.minDeliveryTime || "40 mins"}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Icon name="currency-inr" size={12} color="#666" />
            <Text style={styles.detailText}>
              {restaurant.priceForTwoPerson || "200"} for two
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
    }),
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  topPickBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  topPickText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#AA0000',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  rating: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'column',
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#666',
  },
});