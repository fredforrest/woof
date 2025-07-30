import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { addUserToRoomParticipants } from '../../utils/roomParticipants';
import { logSecurityEvent } from '../../utils/security';

interface JoinRequest {
  userId: string;
  userEmail: string;
  userName: string;
  requestedAt: any;
  status: string;
}

interface ManageRequestsProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

const ManageRequestsComponent: React.FC<ManageRequestsProps> = ({
  roomId,
  roomName,
  onClose
}) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const currentUser = auth().currentUser;

  // Load join requests
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
        if (roomDoc.exists()) {
          const roomData = roomDoc.data();
          const joinRequests = roomData?.joinRequests || [];
          // Only show pending requests
          const pendingRequests = joinRequests.filter((req: JoinRequest) => req.status === 'pending');
          setRequests(pendingRequests);
        }
      } catch (error) {
        console.error('Error loading requests:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [roomId]);

  const handleApproveRequest = async (request: JoinRequest) => {
    if (!currentUser || processingRequest) return;

    try {
      setProcessingRequest(request.userId);

      // Add user to participants
      await addUserToRoomParticipants(roomId, request.userId);

      // Update the request status to approved and remove from pending
      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const roomDoc = await roomRef.get();
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const updatedRequests = (roomData?.joinRequests || []).filter(
          (req: JoinRequest) => req.userId !== request.userId
        );

        await roomRef.update({
          joinRequests: updatedRequests
        });

        // Log security event
        await logSecurityEvent('join_request_approved', {
          roomId,
          roomName,
          approvedUserId: request.userId,
          approvedBy: currentUser.uid
        });

        // Remove from local state
        setRequests(prev => prev.filter(req => req.userId !== request.userId));
        
        Alert.alert('Approved!', `${request.userName} has been added to the room.`);
      }

    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    if (!currentUser || processingRequest) return;

    try {
      setProcessingRequest(request.userId);

      // Remove the request
      const roomRef = firestore().collection('chatRooms').doc(roomId);
      const roomDoc = await roomRef.get();
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const updatedRequests = (roomData?.joinRequests || []).filter(
          (req: JoinRequest) => req.userId !== request.userId
        );

        await roomRef.update({
          joinRequests: updatedRequests
        });

        // Log security event
        await logSecurityEvent('join_request_rejected', {
          roomId,
          roomName,
          rejectedUserId: request.userId,
          rejectedBy: currentUser.uid
        });

        // Remove from local state
        setRequests(prev => prev.filter(req => req.userId !== request.userId));
        
        Alert.alert('Rejected', `${request.userName}'s request has been rejected.`);
      }

    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const renderRequest = ({ item }: { item: JoinRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={styles.userEmail}>{item.userEmail}</Text>
        <Text style={styles.requestTime}>
          Requested: {item.requestedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton, processingRequest === item.userId && styles.disabledButton]}
          onPress={() => handleApproveRequest(item)}
          disabled={processingRequest === item.userId}
        >
          {processingRequest === item.userId ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.approveText}>✓</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton, processingRequest === item.userId && styles.disabledButton]}
          onPress={() => handleRejectRequest(item)}
          disabled={processingRequest === item.userId}
        >
          <Text style={styles.rejectText}>✗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Requests</Text>
      <Text style={styles.roomName}>"{roomName}"</Text>
      
      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No pending join requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={item => item.userId}
          style={styles.requestsList}
        />
      )}
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    margin: 20,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  roomName: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  requestsList: {
    maxHeight: 300,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  requestInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  approveText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rejectText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  closeButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
});

export default ManageRequestsComponent;
