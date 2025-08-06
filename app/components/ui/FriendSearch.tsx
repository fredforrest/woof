import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface User {
  id: string;
  displayName: string;
  email: string;
  dogType: string;
}

interface FriendSearchProps {
  onRequestSent: () => void;
  onCancel: () => void;
}

const FriendSearch: React.FC<FriendSearchProps> = ({ onRequestSent, onCancel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const currentUser = auth().currentUser;

  const debugListAllUsers = async () => {
    try {
      const usersRef = firestore().collection('users');
      const allUsers = await usersRef.limit(20).get();
      
      console.log('=== DEBUG: All users in database ===');
      console.log('Total users:', allUsers.docs.length);
      
      allUsers.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log('User ' + (index + 1) + ':', {
          id: doc.id,
          userName: data.userName,
          displayName: data.displayName,
          email: data.email,
          dogType: data.dogType
        });
      });
      
      Alert.alert('Debug', 'Found ' + allUsers.docs.length + ' users total. Check console for details.');
    } catch (error) {
      console.error('Error debugging users:', error);
      Alert.alert('Error', 'Failed to debug users.');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUser) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      const usersRef = firestore().collection('users');
      
      console.log('Searching for:', searchQuery);
      console.log('Search query lowercase:', searchQuery.toLowerCase());
      
      // Try multiple search strategies
      const searchStrategies = await Promise.all([
        // 1. Search by userName field (case sensitive)
        usersRef
          .where('userName', '>=', searchQuery)
          .where('userName', '<=', searchQuery + '\uf8ff')
          .limit(5)
          .get(),
        
        // 2. Search by displayName field (case sensitive)
        usersRef
          .where('displayName', '>=', searchQuery)
          .where('displayName', '<=', searchQuery + '\uf8ff')
          .limit(5)
          .get(),
          
        // 3. Search by email (exact match)
        usersRef
          .where('email', '==', searchQuery.toLowerCase())
          .limit(5)
          .get(),
      ]);

      const users: User[] = [];
      const seenUserIds = new Set<string>();
      
      console.log('Firestore search results:', searchStrategies.map(q => q.docs.length));
      
      // Combine results from Firestore queries
      searchStrategies.forEach((querySnapshot, index) => {
        console.log('Firestore Query ' + (index + 1) + ' found ' + querySnapshot.docs.length + ' users');
        querySnapshot.forEach(doc => {
          const userData = doc.data();
          // Don't include current user in results and avoid duplicates
          if (doc.id !== currentUser.uid && !seenUserIds.has(doc.id)) {
            seenUserIds.add(doc.id);
            users.push({
              id: doc.id,
              displayName: userData.displayName || userData.userName || 'Unknown User',
              email: userData.email || '',
              dogType: userData.dogType || 'Unknown'
            });
            console.log('Added from Firestore query:', userData);
          }
        });
      });

      // If Firestore queries didn't find much, do manual search (case insensitive)
      if (users.length === 0) {
        console.log('=== Doing manual case-insensitive search ===');
        const allUsersSnapshot = await usersRef.limit(20).get();
        
        allUsersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          const userName = userData.userName || '';
          const displayName = userData.displayName || '';
          const email = userData.email || '';
          
          // Check if search query matches any field (case insensitive)
          if (
            doc.id !== currentUser.uid &&
            !seenUserIds.has(doc.id) &&
            (
              userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              email.toLowerCase().includes(searchQuery.toLowerCase())
            )
          ) {
            seenUserIds.add(doc.id);
            users.push({
              id: doc.id,
              displayName: userData.displayName || userData.userName || 'Unknown User',
              email: userData.email || '',
              dogType: userData.dogType || 'Unknown'
            });
            console.log('Added from manual search:', userData);
          }
        });
      }

      console.log('Final users found:', users);
      setSearchResults(users);
      
      if (users.length === 0) {
        Alert.alert('No Results', 'No users found matching "' + searchQuery + '". The user might not have set up their profile yet.');
      }
    } catch (error) {
      console.error('Error searching for users:', error);
      Alert.alert('Error', 'Failed to search for users. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async (targetUser: User) => {
    if (!currentUser || sendingRequest) return;

    setSendingRequest(targetUser.id);
    
    try {
      // Check if users are already friends
      const currentUserDoc = await firestore().collection('users').doc(currentUser.uid).get();
      const currentUserData = currentUserDoc.data();
      const friends = currentUserData?.friends || [];
      const sentRequests = currentUserData?.sentFriendRequests || [];

      if (friends.includes(targetUser.id)) {
        Alert.alert('Info', 'You are already friends with this user.');
        setSendingRequest(null);
        return;
      }

      if (sentRequests.includes(targetUser.id)) {
        Alert.alert('Info', 'You have already sent a friend request to this user.');
        setSendingRequest(null);
        return;
      }

      // Check if the target user has already sent a request to current user (mutual request)
      const targetUserDoc = await firestore().collection('users').doc(targetUser.id).get();
      const targetUserData = targetUserDoc.data();
      const targetSentRequests = targetUserData?.sentFriendRequests || [];

      if (targetSentRequests.includes(currentUser.uid)) {
        // Mutual request - automatically accept and make them friends
        await acceptExistingRequest(targetUser);
        return;
      }

      // Create new friend request
      await firestore().collection('friendRequests').add({
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || 'Unknown User',
        fromUserEmail: currentUser.email || '',
        toUserId: targetUser.id,
        status: 'pending',
        requestedAt: firestore.FieldValue.serverTimestamp()
      });

      // Add to current user's sent requests
      await firestore().collection('users').doc(currentUser.uid).update({
        sentFriendRequests: firestore.FieldValue.arrayUnion(targetUser.id)
      });

      Alert.alert('Success', 'Friend request sent to ' + targetUser.displayName + '!');
      onRequestSent();
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      setSendingRequest(null);
    }
  };

  const acceptExistingRequest = async (targetUser: User) => {
    try {
      // Find the existing request
      const requestsQuery = await firestore()
        .collection('friendRequests')
        .where('fromUserId', '==', targetUser.id)
        .where('toUserId', '==', currentUser!.uid)
        .where('status', '==', 'pending')
        .get();

      if (requestsQuery.empty) {
        Alert.alert('Error', 'No pending request found.');
        return;
      }

      const requestDoc = requestsQuery.docs[0];
      
      // Update request status
      await requestDoc.ref.update({ status: 'accepted' });

      // Add both users to each other's friends list
      const batch = firestore().batch();
      
      batch.update(firestore().collection('users').doc(currentUser!.uid), {
        friends: firestore.FieldValue.arrayUnion(targetUser.id),
        sentFriendRequests: firestore.FieldValue.arrayRemove(targetUser.id)
      });
      
      batch.update(firestore().collection('users').doc(targetUser.id), {
        friends: firestore.FieldValue.arrayUnion(currentUser!.uid),
        sentFriendRequests: firestore.FieldValue.arrayRemove(currentUser!.uid)
      });

      await batch.commit();

      Alert.alert('Success', 'You and ' + targetUser.displayName + ' are now friends!');
      onRequestSent();
      
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request.');
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userDetails}>{item.email}</Text>
        <Text style={styles.userDetails}>🐕 {item.dogType}</Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, sendingRequest === item.id && styles.disabledButton]}
        onPress={() => handleSendFriendRequest(item)}
        disabled={sendingRequest === item.id}
      >
        {sendingRequest === item.id ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.addButtonText}>Add Friend</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Friends</Text>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.searchButton, searching && styles.disabledButton]}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Debug button */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={debugListAllUsers}
      >
        <Text style={styles.debugButtonText}>List All Users</Text>
      </TouchableOpacity>

      <FlatList
        data={searchResults}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        style={styles.resultsList}
        ListEmptyComponent={
          !searching && searchQuery.length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFF',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#DDD',
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  debugButton: {
    backgroundColor: '#FF9800',
    margin: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  resultsList: {
    flex: 1,
  },
  userItem: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default FriendSearch;
