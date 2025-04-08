// screens/ChatScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, Button, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

//Message structure
interface Message {
  id: string;
  text: string;
  createdAt: any; 
  userId: string;
  senderName: string; 
  senderAvatarUrl?: string | null; 
}

const ChatScreen = ({ route }: {route: any}) => {
  // Extract roomId and roomName from route params
  const { roomId, roomName } = route.params; // Get params passed during navigation
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const currentUser = auth().currentUser;

  // Fetch Messages
  useEffect(() => {
    if (!roomId){
        Alert.alert("Error", "Invalid room ID.");
     return; // Ensure roomId is valid
    }

    // Firestore listener to fetch messages
    // Use 'onSnapshot' to listen for real-time updates
    // Use 'orderBy' to sort messages by creation time
    // Use 'asc' to show oldest messages first
    const messagesListener = firestore()
      .collection('chatRooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'asc') // Show oldest messages first
      .onSnapshot(querySnapshot => {
        const fetchedMessages: Message[] = [];
         if (querySnapshot) {
             querySnapshot.forEach(doc => {
               fetchedMessages.push({
                 id: doc.id,
                 ...doc.data(),
               } as Message);
             });
         }
        setMessages(fetchedMessages);
        if (loading) setLoading(false);
      }, error => {
        console.error("Error fetching messages: ", error);
        setLoading(false);
      });

    // Stop listening for updates when no longer required
    return () => messagesListener();
  }, [roomId]); // Re-run if roomId changes

  // Send Message Function (using useCallback for potential optimization)
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentUser || isSending) return;

    
    setIsSending(true);
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately

    const senderName = currentUser.displayName || 'Anonymous'; // Get display name, fallback
    const senderAvatarUrl = currentUser.photoURL || null; // Get photo URL, can be null


    // Create message object
    const messageTimestamp = firestore.FieldValue.serverTimestamp();
    const messageData = {
      text: messageText,
      createdAt: messageTimestamp,
      userId: currentUser.uid,
      senderName: senderName,
      senderAvatarUrl: senderAvatarUrl, // Store URL (or null/placeholder)
    };

    // Reference to Firestore collections
    const roomRef = firestore().collection('chatRooms').doc(roomId);
    const messagesRef = roomRef.collection('messages');

    // Batch write to Firestore
    const batch = firestore().batch();
    batch.set(messagesRef.doc(), messageData); // Add message
    batch.update(roomRef, { // Update room's timestamp and last message text
      lastMessageTimestamp: messageTimestamp,
      lastMessageText: messageText,
      senderName: senderName,
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error sending message: ", error);
      setNewMessage(messageText); // Restore text if sending failed
      Alert.alert("Error", "Could not send message.");
    } finally {
       setIsSending(false);
    }
  }, [newMessage, currentUser, roomId, isSending]);


  // Render Message Item
  const renderMessageItem = ({ item }: { item: Message }) => (
    <View style={[
        styles.messageBubble,
        item.userId === currentUser?.uid ? styles.myMessage : styles.theirMessage
      ]}>
      {/* Optional: Display sender name if not my message */}
      {/* {item.userId !== currentUser?.uid && <Text style={styles.senderName}>{item.userName || 'User'}</Text>} */}
      <Text style={styles.messageText}>{item.text}</Text>
      {/* Optional: Display timestamp */}
      {/* <Text style={styles.messageTime}>{item.createdAt?.toLocaleTimeString()}</Text> */}
    </View>
  );


  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0} // Adjust as needed
    >
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        style={styles.messageList}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>}
        inverted={true} // Invert the list to show the latest messages at the bottom
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <Button title={isSending ? "..." : "Send"} onPress={handleSendMessage} disabled={!newMessage.trim() || isSending}/>
      </View>
    </KeyboardAvoidingView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { flex: 1, paddingHorizontal: 10 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f9f9f9',
    alignItems: 'center', 
  },
  input: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 5, // Adjust padding
    marginRight: 10,
    maxHeight: 100, // Limit input height for multiline
    backgroundColor: '#fff',
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginVertical: 4,
    maxWidth: '80%', // Prevent bubble from taking full width
  },
  myMessage: {
    backgroundColor: '#DCF8C6', // Example: Light green for own messages
    alignSelf: 'flex-end', // Align to the right
    borderBottomRightRadius: 5, // Flat edge
  },
  theirMessage: {
    backgroundColor: '#E5E5EA', // Example: Light gray for others' messages
    alignSelf: 'flex-start', // Align to the left
    borderBottomLeftRadius: 5, // Flat edge
  },
  messageText: {
     fontSize: 15,
  },
  senderName: { // Optional style
     fontSize: 12,
     color: '#888',
     marginBottom: 2,
     fontWeight: 'bold',
  },
  messageTime: { // Optional style
     fontSize: 10,
     color: '#999',
     textAlign: 'right',
     marginTop: 2,
  },
   emptyText: {
     textAlign: 'center',
     marginTop: 50,
     fontSize: 16,
     color: '#888',
     // Compensate for 'inverted' FlatList if needed
     transform: [{ scaleY: -1 }]
   }
});

export default ChatScreen;