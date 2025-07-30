import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface JoinRequest {
  userId: string;
  userEmail: string;
  userName: string;
  requestedAt: string;
  status: string;
}

interface RoomWithRequests {
  id: string;
  name: string;
  joinRequests: JoinRequest[];
}

interface JoinRequestNotificationsProps {
  onRequestsChange?: (count: number) => void;
}

const JoinRequestNotifications: React.FC<JoinRequestNotificationsProps> = ({ onRequestsChange }) => {
  const [roomsWithRequests, setRoomsWithRequests] = useState<RoomWithRequests[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Listen for rooms where current user is the owner and has pending join requests
    const unsubscribe = firestore()
      .collection('chatRooms')
      .where('createdBy', '==', currentUser.uid)
      .where('isPrivate', '==', true)
      .onSnapshot(snapshot => {
        const roomsWithPendingRequests: RoomWithRequests[] = [];
        let totalRequests = 0;

        snapshot.docs.forEach(doc => {
          const roomData = doc.data();
          const joinRequests = roomData.joinRequests || [];
          const pendingRequests = joinRequests.filter((req: JoinRequest) => req.status === 'pending');
          
          if (pendingRequests.length > 0) {
            roomsWithPendingRequests.push({
              id: doc.id,
              name: roomData.name,
              joinRequests: pendingRequests
            });
            totalRequests += pendingRequests.length;
          }
        });

        setRoomsWithRequests(roomsWithPendingRequests);
        setLoading(false);
        
        // Notify parent component of request count change
        if (onRequestsChange) {
          onRequestsChange(totalRequests);
        }
      });

    return () => unsubscribe();
  }, [currentUser, onRequestsChange]);

  const handleApproveRequest = async (roomId: string, request: JoinRequest) => {
    if (!currentUser || processing) return;
    
    setProcessing(`${roomId}-${request.userId}`);
    
    try {
      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const roomDoc = await roomRef.get();
      
      if (!roomDoc.exists) return;
      
      const roomData = roomDoc.data();
      const joinRequests = roomData?.joinRequests || [];
      const participants = roomData?.participants || [];
      
      // Update the request status to approved
      const updatedRequests = joinRequests.map((req: JoinRequest) => 
        req.userId === request.userId ? { ...req, status: 'approved' } : req
      );
      
      // Add user to participants if not already there
      const updatedParticipants = participants.includes(request.userId) 
        ? participants 
        : [...participants, request.userId];
      
      await roomRef.update({
        joinRequests: updatedRequests,
        participants: updatedParticipants
      });
      
      Alert.alert('Success', `${request.userName} has been added to the room!`);
      
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectRequest = async (roomId: string, request: JoinRequest) => {
    if (!currentUser || processing) return;
    
    setProcessing(`${roomId}-${request.userId}`);
    
    try {
      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const roomDoc = await roomRef.get();
      
      if (!roomDoc.exists) return;
      
      const roomData = roomDoc.data();
      const joinRequests = roomData?.joinRequests || [];
      
      // Update the request status to rejected
      const updatedRequests = joinRequests.map((req: JoinRequest) => 
        req.userId === request.userId ? { ...req, status: 'rejected' } : req
      );
      
      await roomRef.update({
        joinRequests: updatedRequests
      });
      
      Alert.alert('Request Rejected', `${request.userName}'s request has been rejected.`);
      
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0066CC" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  if (roomsWithRequests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No pending join requests</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔔 Join Requests</Text>
      
      {roomsWithRequests.map(room => (
        <View key={room.id} style={styles.roomContainer}>
          <Text style={styles.roomName}>{room.name}</Text>
          
          {room.joinRequests.map(request => (
            <View key={request.userId} style={styles.requestContainer}>
              <View style={styles.requestInfo}>
                <Text style={styles.userName}>{request.userName}</Text>
                <Text style={styles.userEmail}>{request.userEmail}</Text>
                <Text style={styles.requestTime}>
                  Requested: {new Date(request.requestedAt).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={() => handleApproveRequest(room.id, request)}
                  disabled={processing === `${room.id}-${request.userId}`}
                >
                  {processing === `${room.id}-${request.userId}` ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.approveButtonText}>✓ Approve</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => handleRejectRequest(room.id, request)}
                  disabled={processing === `${room.id}-${request.userId}`}
                >
                  {processing === `${room.id}-${request.userId}` ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.rejectButtonText}>✗ Reject</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  roomContainer: {
    backgroundColor: '#FFF',
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  requestContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  requestInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  requestTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default JoinRequestNotifications;
