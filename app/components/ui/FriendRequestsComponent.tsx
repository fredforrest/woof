import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId: string;
  requestedAt: any;
  status: string;
}

interface FriendRequestsProps {
  onRequestsChange?: (count: number) => void;
}

const FriendRequestsComponent: React.FC<FriendRequestsProps> = ({ onRequestsChange }) => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // Listen for incoming friend requests
    const setupListener = () => {
      const unsubscribe = firestore()
        .collection('friendRequests')
        .where('toUserId', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .orderBy('requestedAt', 'desc')
        .onSnapshot(snapshot => {
          const requests: FriendRequest[] = [];
          
          snapshot.docs.forEach(doc => {
            requests.push({
              id: doc.id,
              ...doc.data()
            } as FriendRequest);
          });

          setFriendRequests(requests);
          setLoading(false);
          
          // Notify parent component of request count change
          if (onRequestsChange) {
            onRequestsChange(requests.length);
          }
        }, error => {
          console.error('Error fetching friend requests:', error);
          
          // If it's an index error, try a simpler query as fallback
          if ((error as any).code === 'failed-precondition') {
            console.log('Index still building, using fallback query...');
            fallbackQuery();
          } else {
            setLoading(false);
          }
        });

      return unsubscribe;
    };

    // Fallback query without ordering (simpler, doesn't require index)
    const fallbackQuery = () => {
      const unsubscribe = firestore()
        .collection('friendRequests')
        .where('toUserId', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .onSnapshot(snapshot => {
          const requests: FriendRequest[] = [];
          
          snapshot.docs.forEach(doc => {
            requests.push({
              id: doc.id,
              ...doc.data()
            } as FriendRequest);
          });

          // Sort manually since we can't use orderBy
          requests.sort((a, b) => {
            const aTime = a.requestedAt?.toDate?.() || new Date(a.requestedAt);
            const bTime = b.requestedAt?.toDate?.() || new Date(b.requestedAt);
            return bTime.getTime() - aTime.getTime();
          });

          setFriendRequests(requests);
          setLoading(false);
          
          // Notify parent component of request count change
          if (onRequestsChange) {
            onRequestsChange(requests.length);
          }
        }, error => {
          console.error('Error with fallback query:', error);
          setLoading(false);
        });

      return unsubscribe;
    };

    const unsubscribe = setupListener();
    return () => unsubscribe();
  }, [currentUser, onRequestsChange]);

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!currentUser || processing) return;
    
    setProcessing(request.id);
    
    try {
      // Update request status
      await firestore().collection('friendRequests').doc(request.id).update({
        status: 'accepted'
      });

      // Add both users to each other's friends list
      const batch = firestore().batch();
      
      batch.update(firestore().collection('users').doc(currentUser.uid), {
        friends: firestore.FieldValue.arrayUnion(request.fromUserId)
      });
      
      batch.update(firestore().collection('users').doc(request.fromUserId), {
        friends: firestore.FieldValue.arrayUnion(currentUser.uid),
        sentFriendRequests: firestore.FieldValue.arrayRemove(currentUser.uid)
      });

      await batch.commit();

      Alert.alert('Success', `You and ${request.fromUserName} are now friends!`);
      
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    if (!currentUser || processing) return;
    
    Alert.alert(
      'Reject Friend Request',
      `Are you sure you want to reject ${request.fromUserName}'s friend request?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessing(request.id);
            
            try {
              // Update request status
              await firestore().collection('friendRequests').doc(request.id).update({
                status: 'rejected'
              });

              // Remove from sender's sent requests
              await firestore().collection('users').doc(request.fromUserId).update({
                sentFriendRequests: firestore.FieldValue.arrayRemove(currentUser.uid)
              });

              Alert.alert('Request Rejected', 'Friend request has been rejected.');
              
            } catch (error) {
              console.error('Error rejecting friend request:', error);
              Alert.alert('Error', 'Failed to reject friend request. Please try again.');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading friend requests...</Text>
      </View>
    );
  }

  if (friendRequests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Friend Requests</Text>
        <Text style={styles.emptySubtitle}>You don't have any pending friend requests.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        Friend Requests ({friendRequests.length})
      </Text>
      
      {friendRequests.map((request) => (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestInfo}>
            <Text style={styles.userName}>{request.fromUserName}</Text>
            <Text style={styles.userEmail}>{request.fromUserEmail}</Text>
            <Text style={styles.requestDate}>
              Requested: {formatDate(request.requestedAt)}
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.acceptButton,
                processing === request.id && styles.disabledButton
              ]}
              onPress={() => handleAcceptRequest(request)}
              disabled={processing === request.id}
            >
              {processing === request.id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.rejectButton,
                processing === request.id && styles.disabledButton
              ]}
              onPress={() => handleRejectRequest(request)}
              disabled={processing === request.id}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  requestCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestInfo: {
    marginBottom: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default FriendRequestsComponent;
