import { StyleSheet, Dimensions } from 'react-native';

export const colors = {
  // Primary Colors
  primaryRed: '#d64444',        // Strong Red
  primaryGreen: '#25d366',      // WhatsApp Green (Primary Green)
  primaryViolet: '#8a2be2',     // Bright Violet
  primaryWhite: '#ffffff',      // Pure White
  primaryBlack: '#000000',      // Pure Black,

  // Red Shades
  lightRed: '#f8d7da',          // Light Red (Backgrounds/Alerts)
  darkRed: '#a50000',           // Dark Red (Text/Buttons)

  // Green Shades
  lightGreen: '#d4edda',        // Light Green (Success BG)
  mediumGreen: '#28a745',       // Medium Green (Buttons/Highlights)
  darkGreen: '#1e7e34',         // Dark Green (Text/Accents)

  // Violet Shades
  lightViolet: '#e6e6fa',       // Light Violet (Backgrounds)
  mediumViolet: '#9932cc',      // Medium Violet
  darkViolet: '#4b0082',        // Dark Violet (Accents)

  // Black & White Variants
  offWhite: '#f0f0f0',          // Soft White (Backgrounds)
  lightGray: '#d3d3d3',         // Light Gray (Borders/Dividers)
  darkGray: '#212529',          // Dark Gray (Text/Icons)

  // Accent Colors
  successGreen: '#25d366',      // Green for Success Messages
  warningYellow: '#ffc107',     // Yellow for Warnings
  errorRed: '#f44336',          // Bright Red for Errors

  // Transparent Variants
  transparentBlack: 'rgba(0,0,0,0.5)',  // Overlay Black
  transparentWhite: 'rgba(255,255,255,0.7)', // Overlay White
};

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  hotelName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: 10,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  statusText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  onlineText: {
    color: colors.primaryGreen,
  },
  offlineText: {
    color: colors.primaryRed,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 15,
  },
  hotelImage: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  ownerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkGray,
  },
  addressText: {
    fontSize: 14,
    color: colors.darkGray,
    textAlign: 'center',
    marginTop: 5,
  },
  phoneText: {
    fontSize: 14,
    color: colors.darkGray,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkGray,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    width: (width - 40) / 2,
    backgroundColor: colors.primaryWhite,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: colors.darkGray,
    marginBottom: 5,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primaryViolet,
  },
  amenitiesContainer: {
    backgroundColor: colors.primaryWhite,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 30,
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amenityItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  amenityText: {
    fontSize: 14,
    color: colors.darkGray,
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.offWhite,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.offWhite,
    padding: 20,
  },
  errorText: {
    color: colors.primaryRed,
    fontSize: 16,
    textAlign: 'center',
  },
  newBookingButton: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 30,
    shadowColor: colors.primaryBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  newBookingText: {
    color: colors.primaryWhite,
    fontSize: 16,
    fontWeight: 'bold',
  }
});