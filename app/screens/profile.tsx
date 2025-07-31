import React, {useEffect, useState} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../components/navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';


const Profile = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const currentUser = auth().currentUser;
  const userName = currentUser?.displayName || 'User';
  const userEmail = currentUser?.email || 'Email not available';
  const photoURL = currentUser?.photoURL;
  const [dogType, setDogType] = useState('');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Fetch dogType from Firestore
  useEffect(() => {
    const fetchDogType = async () => {
      try {
        const userDoc = await firestore().collection('users').doc(currentUser?.uid).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDogType(userData?.dogType || 'Alien'); // Set dogType from Firestore
        }
      } catch (error) {
        console.error('Error fetching dogType:', error);
      }
    };

    fetchDogType();
  }, [currentUser]);

  // Listen for pending friend requests count
  useEffect(() => {
    if (!currentUser) return;

    const setupListener = () => {
      const unsubscribe = firestore()
        .collection('friendRequests')
        .where('toUserId', '==', currentUser.uid)
        .where('status', '==', 'pending')
        .onSnapshot(snapshot => {
          setPendingRequestsCount(snapshot.docs.length);
        }, error => {
          console.error('Error fetching friend requests count:', error);
          // Don't break the app if there's an index error, just set count to 0
          setPendingRequestsCount(0);
        });

      return unsubscribe;
    };

    const unsubscribe = setupListener();
    return () => unsubscribe();
  }, [currentUser]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topButtons}>
        <TouchableOpacity
          style={styles.friendsButton}
          onPress={() => navigation.navigate('Friends' as never)}
        >
          <Text style={styles.buttonText}>Friends</Text>
          {pendingRequestsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Profile Settings')}
        >
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Display Profile Picture */}
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={styles.profileImage} />
      ) : (
        <Text style={styles.noImageText}>No Profile Picture</Text>
      )}

      {/* User Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Username: {userName}</Text>
        <Text style={styles.infoText}>Email: {userEmail}</Text>
        <Text style={styles.infoText}>Dog Breed: {dogType}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Align content to the top
    alignItems: 'center',
    paddingTop: 40, // Add padding to move content down slightly from the top
    backgroundColor: '#fff', // Optional: Add a background color for better visibility
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 20,
  },
  friendsButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  settingsButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'absolute',
    top: -5,
    right: -5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50, // Make the image circular
    marginBottom: 20,
  },
  noImageText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 20,
  },
  infoBox: {
    width: '90%',
    backgroundColor: '#F5F5F5', // Light gray background
    borderRadius: 10, // Rounded corners
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // Shadow for Android
    marginTop: 20,
  },
  infoText: {
    fontSize: 20,
    marginBottom: 10,
    color: '#black', // Dark blue color
    fontWeight: '500',
  },
  settingsButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Profile;