
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from "react-native"
import { useEffect, useState, useCallback } from "react"
import Layout from "../../components/Layout/Layout"
import { useToken } from "../../context/AuthContext"
import useHotelApi from "../../context/HotelDetails"
import { Feather, MaterialIcons, FontAwesome5, Ionicons } from "@expo/vector-icons"
import styles from "./Profile.style"
import { useNavigation } from "@react-navigation/native"

export default function Profile() {
    const { token } = useToken()
    const [hotelData, setHotelData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const { findDetails } = useHotelApi()
    const navigation = useNavigation()
    const fetchHotelData = useCallback(async () => {
        setLoading(true)
        try {
            const response = await findDetails()
            if (response.success) {
                setHotelData(response.data.data)
                console.log(response.data.data)
            } else {
                setError(response.message)
            }
        } catch (err) {
            setError("Failed to fetch hotel data. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [findDetails])

    useEffect(() => {
        fetchHotelData()
    }, [token])

    if (loading) {
        return (
            <Layout activeTab="profile">
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#D32F2F" />
                    <Text style={styles.loadingText}>Loading profile data...</Text>
                </View>
            </Layout>
        )
    }

    if (error) {
        return (
            <Layout activeTab="profile">
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#D32F2F" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchHotelData}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </Layout>
        )
    }

    if (!hotelData) {
        return (
            <Layout activeTab="profile">
                <View style={styles.errorContainer}>
                    <MaterialIcons name="info-outline" size={48} color="#D32F2F" />
                    <Text style={styles.errorText}>No profile data available</Text>
                </View>
            </Layout>
        )
    }

    const {
        BhJsonData,
        hotel_name,
        hotel_owner,
        hotel_phone,
        hotel_address,
        hotel_main_show_image,
        amenities,
        ClearAllCheckOut,
        contactNumberVerify,
        Documents,
        DocumentUploaded,
        DocumentUploadedVerified,
    } = hotelData

    console.log(DocumentUploaded)
    const renderStatusBadge = (isActive) => (
        <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>{isActive ? "Active" : "Inactive"}</Text>
        </View>
    )

    const renderDocumentStatus = () => {
        if (!DocumentUploaded) {
            return (
                <View style={styles.documentStatus}>
                    <MaterialIcons name="warning" size={20} color="#FFA000" />
                    <Text style={styles.documentPending}>Documents Not Uploaded</Text>
                </View>
            )
        } else if (!DocumentUploadedVerified) {
            return (
                <View style={styles.documentStatus}>
                    <MaterialIcons name="pending" size={20} color="#1976D2" />
                    <Text style={styles.documentPending}>Verification Pending</Text>
                </View>
            )
        } else {
            return (
                <View style={styles.documentStatus}>
                    <MaterialIcons name="verified" size={20} color="#2E7D32" />
                    <Text style={styles.documentVerified}>Documents Verified</Text>
                </View>
            )
        }
    }

    return (
        <Layout activeTab="profile">
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Hotel Header */}
                <View style={styles.hotelHeader}>
                    <Image
                        source={{ uri: hotel_main_show_image || "https://via.placeholder.com/150" }}
                        style={styles.hotelImage}
                    />
                    <View style={styles.hotelInfo}>
                        <Text style={styles.hotelName}>{hotel_name}</Text>
                        <Text style={styles.hotelOwner}>Owner: {hotel_owner}</Text>
                        <View style={styles.phoneContainer}>
                            <Feather name="phone" size={14} color="#D32F2F" />
                            <Text style={styles.hotelPhone}>{hotel_phone}</Text>
                        </View>
                    </View>
                </View>

                {/* Address */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="map-pin" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Address</Text>
                    </View>
                    <Text style={styles.addressText}>{hotel_address}</Text>
                </View>

                {/* User Details */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="user" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>User Details</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{BhJsonData.name}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email:</Text>
                        <Text style={styles.detailValue}>{BhJsonData.email}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone:</Text>
                        <Text style={styles.detailValue}>{BhJsonData.number}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>DOB:</Text>
                        <Text style={styles.detailValue}>{new Date(BhJsonData.dob).toLocaleDateString()}</Text>
                    </View>
                </View>

                {/* Referral Information */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <FontAwesome5 name="user-friends" size={16} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Referral Information</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>My Referral Code:</Text>
                        <View style={styles.referralCodeContainer}>
                            <Text style={styles.referralCode}>{BhJsonData.myReferral}</Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Applied Referral:</Text>
                        <Text style={styles.detailValue}>
                            {BhJsonData.is_referral_applied ? BhJsonData.referral_code_which_applied : "None"}
                        </Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Referral Status:</Text>
                        {renderStatusBadge(BhJsonData.is_referral_applied)}
                    </View>
                </View>

                {/* Account Status */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="shield-checkmark-outline" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Account Status</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Status:</Text>
                        {renderStatusBadge(BhJsonData.isActive)}
                    </View>


                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Account Complete:</Text>
                        {renderStatusBadge(ClearAllCheckOut)}
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Plan Status:</Text>
                        {renderStatusBadge(BhJsonData.plan_status)}
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Free Plan:</Text>
                        {renderStatusBadge(BhJsonData.isFreePlanActive)}
                    </View>
                </View>

                {/* Wallet & Recharge */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="credit-card" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Wallet & Recharge</Text>
                    </View>

                    <View style={styles.walletContainer}>
                        <View style={styles.walletItem}>
                            <Text style={styles.walletLabel}>Wallet Balance</Text>
                            <Text style={styles.walletAmount}>₹{BhJsonData.wallet}</Text>
                        </View>

                        <View style={styles.walletItem}>
                            <Text style={styles.walletLabel}>Recharge</Text>
                            <Text style={styles.walletAmount}>₹{BhJsonData.recharge}</Text>
                        </View>
                    </View>
                </View>

                {/* Documents */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Feather name="file-text" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Documents</Text>
                    </View>

                    {renderDocumentStatus()}

                    {/* <View style={styles.documentList}>
                        {BhJsonData.Documents.documentFirst && (
                            <View style={styles.documentItem}>
                                <Feather name="file" size={16} color="#D32F2F" />
                                <Text style={styles.documentName}>Document 1</Text>
                            </View>
                        )}

                        {BhJsonData.Documents.documentSecond && (
                            <View style={styles.documentItem}>
                                <Feather name="file" size={16} color="#D32F2F" />
                                <Text style={styles.documentName}>Document 2</Text>
                            </View>
                        )}

                        {BhJsonData.Documents.documentThird && (
                            <View style={styles.documentItem}>
                                <Feather name="file" size={16} color="#D32F2F" />
                                <Text style={styles.documentName}>Document 3</Text>
                            </View>
                        )}

                        {!BhJsonData.Documents.documentFirst &&
                            !BhJsonData.Documents.documentSecond &&
                            !BhJsonData.Documents.documentThird && <View>
                                <Text style={styles.noDocuments}>No documents uploaded</Text>
                                <TouchableOpacity onPress={()=> navigation.navigate('upload_Documents')} style={styles.uploadButton}>
                                    <Text style={styles.uploadButtonText}>Upload Documents</Text>
                                </TouchableOpacity>
                                </View>}
                    </View> */}
                </View>

                {/* Amenities */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="hotel" size={18} color="#D32F2F" />
                        <Text style={styles.cardTitle}>Amenities</Text>
                    </View>

                    <View style={styles.amenitiesContainer}>
                        {Object.entries(amenities).map(([key, value]) => (
                            <View key={key} style={styles.amenityItem}>
                                {value ? (
                                    <MaterialIcons name="check-circle" size={16} color="#2E7D32" />
                                ) : (
                                    <MaterialIcons name="cancel" size={16} color="#D32F2F" />
                                )}
                                <Text style={styles.amenityText}>
                                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </Layout>
    )
}

