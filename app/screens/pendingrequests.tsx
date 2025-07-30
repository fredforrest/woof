import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../components/navigation/types';

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
  description?: string;
  joinRequests: JoinRequest[];
}

const PendingRequestsScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [roomsWithRequests, setRoomsWithRequests] = useState<RoomWithRequests[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) {
      navigation.goBack();
      return;
    }

    // Listen for rooms where current user is the owner and has pending join requests
    const unsubscribe = firestore()
      .collection('chatRooms')
      .where('createdBy', '==', currentUser.uid)
      .onSnapshot(snapshot => {
        const roomsWithPendingRequests: RoomWithRequests[] = [];

        snapshot.docs.forEach(doc => {
          const roomData = doc.data();
          const joinRequests = roomData.joinRequests || [];
          const pendingRequests = joinRequests.filter((req: JoinRequest) => req.status === 'pending');
          
          if (pendingRequests.length > 0) {
            roomsWithPendingRequests.push({
              id: doc.id,
              name: roomData.name,
              description: roomData.description,
              joinRequests: pendingRequests
            });
          }
        });

        setRoomsWithRequests(roomsWithPendingRequests);
        setLoading(false);
      }, error => {
        console.error('Error fetching pending requests:', error);
        setLoading(false);
        Alert.alert('Error', 'Failed to load pending requests.');
      });

    return () => unsubscribe();
  }, [currentUser, navigation]);

  const handleApproveRequest = async (roomId: string, request: JoinRequest) => {
    if (!currentUser || processing) return;
    
    setProcessing(`${roomId}-${request.userId}`);
    
    try {
      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const roomDoc = await roomRef.get();
      
      if (!roomDoc.exists) {
        Alert.alert('Error', 'Room not found.');
        return;
      }
      
      const roomData = roomDoc.data();
      const joinRequests = roomData?.joinRequests || [];
      const participants = roomData?.participants || [];
      
      // Update the request status to approved and add user to participants
      const updatedRequests = joinRequests.map((req: JoinRequest) => 
        req.userId === request.userId ? { ...req, status: 'approved' } : req
      );
      
      const updatedParticipants = participants.includes(request.userId) 
        ? participants 
        : [...participants, request.userId];
      
      await roomRef.update({
        joinRequests: updatedRequests,
        participants: updatedParticipants
      });
      
      Alert.alert('✅ Approved!', `${request.userName} has been added to the room and can now participate in the chat.`);
      
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectRequest = async (roomId: string, request: JoinRequest) => {
    if (!currentUser || processing) return;
    
    Alert.alert(
      'Reject Request?',
      `Are you sure you want to reject ${request.userName}'s request to join?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
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
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pending Requests</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pending Requests</Text>
      </View>

      {roomsWithRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No Pending Requests</Text>
          <Text style={styles.emptyText}>
            You don't have any pending join requests for your private rooms.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          <Text style={styles.subtitle}>
            You have {roomsWithRequests.reduce((total, room) => total + room.joinRequests.length, 0)} pending request(s)
          </Text>
          
          {roomsWithRequests.map(room => (
            <View key={room.id} style={styles.roomContainer}>
              <View style={styles.roomHeader}>
                <Text style={styles.roomName}>🔒 {room.name}</Text>
                <Text style={styles.roomDescription}>
                  {room.description || 'Private room'}
                </Text>
              </View>
              
              {room.joinRequests.map(request => (
                <View key={request.userId} style={styles.requestContainer}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.userName}>{request.userName}</Text>
                    <Text style={styles.userEmail}>{request.userEmail}</Text>
                    <Text style={styles.requestTime}>
                      Requested: {new Date(request.requestedAt).toLocaleDateString()} at{' '}
                      {new Date(request.requestedAt).toLocaleTimeString()}
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
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginRight: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    padding: 15,
    textAlign: 'center',
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollContainer: {
    flex: 1,
  },
  roomContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
  },
  requestContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  requestInfo: {
    flex: 1,
    marginRight: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
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
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PendingRequestsScreen;
