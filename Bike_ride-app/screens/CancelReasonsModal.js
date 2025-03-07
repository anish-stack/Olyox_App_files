import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CancelReasonsModal = ({ appState, updateState, handleCancelRide }) => {
    
    const MemoizedCancelModal = useMemo(() => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={appState.showCancelModal}
            onRequestClose={() => updateState({ showCancelModal: false })}
        >
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)'
            }}>
                <View style={{
                    width: '90%',
                    backgroundColor: 'white',
                    borderRadius: 10,
                    padding: 20,
                    maxHeight: '80%'
                }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 15
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Cancel Reason</Text>
                        <TouchableOpacity
                            onPress={() => updateState({ showCancelModal: false })}
                        >
                            <MaterialCommunityIcons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 300 }}>
                        {appState.cancelReasons.map((item) => (
                            <TouchableOpacity
                                key={item._id}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 15,
                                    borderRadius: 8,
                                    marginBottom: 10,
                                    backgroundColor: appState.selectedReason === item._id ? '#f0f0f0' : 'transparent',
                                    borderWidth: 1,
                                    borderColor: appState.selectedReason === item._id ? '#FF3B30' : '#e0e0e0'
                                }}
                                onPress={() => updateState({ selectedReason: item._id })}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                                    <Text style={{ color: '#666', marginTop: 5 }}>{item.description}</Text>
                                </View>
                                <View>
                                    {appState.selectedReason === item._id && (
                                        <MaterialCommunityIcons name="check" size={24} color="green" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={{
                            backgroundColor: appState.selectedReason ? '#FF3B30' : '#ccc',
                            padding: 15,
                            borderRadius: 8,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: 15
                        }}
                        onPress={handleCancelRide}
                        disabled={!appState.selectedReason}
                    >
                        <MaterialCommunityIcons name="cancel" size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Ride</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    ), [appState.showCancelModal, appState.selectedReason, appState.cancelReasons]);

    return MemoizedCancelModal;
};

export default CancelReasonsModal;
