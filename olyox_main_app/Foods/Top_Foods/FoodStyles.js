import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
        padding: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1C1C1C',
    },
    viewAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    viewAllText: {
        color: '#E23744',
        fontSize: 14,
        fontWeight: '600',
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    foodCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    imageContainer: {
        position: 'relative',
        height: 140,
    },
    foodImage: {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    offerBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: '#002B93',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    offerText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    offerSubtext: {
        color: '#FFFFFF',
        fontSize: 10,
    },
    bookmarkButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: 6,
        borderRadius: 50,
    },
    content: {
        padding: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    restaurantName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C1C1C',
        flex: 1,
        marginRight: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#48C479',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    rating: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 2,
    },
    cuisines: {
        fontSize: 12,
        color: '#666666',
        marginBottom: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    deliveryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        color: '#666666',
        marginLeft: 4,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#666666',
        marginHorizontal: 6,
    },
    priceText: {
        fontSize: 12,
        color: '#666666',
    },
});