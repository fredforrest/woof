import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useHeaderHeight } from '@react-navigation/elements';
import { validateRoomId } from '../utils/security';

// Import new hooks and components
import { 
  useMessages, 
  useMessageSending, 
  useTypingIndicator, 
  useRoomPermissions, 
  usePhotoPicker, 
  useSecurity,
  Message
} from '../hooks';
import { MessageList, MessageInput } from '../components/chat';

const ChatScreen = ({ route }: any) => {
  const { roomId, roomName } = route.params; // Get roomId and roomName from navigation parameters
  
  // Security: Validate roomId
  if (!validateRoomId(roomId)) {
    Alert.alert('Error', 'Invalid room ID');
    return (
      <View style={styles.center}>
        <Text>Invalid room</Text>
      </View>
    );
  }

  // Use custom hooks for better SoC
  const { 
    messages, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMoreMessages, 
    flatListRef 
  } = useMessages(roomId);
  
  const { 
    newMessage, 
    isSending, 
    setNewMessage, 
    handleSendMessage, 
    handleSendPhoto 
  } = useMessageSending(roomId);
  
  const { handleTyping } = useTypingIndicator(roomId);
  useRoomPermissions(roomId, roomName); // This hook handles header setup internally
  const { pickAndSendPhoto } = usePhotoPicker();
  
  // Security hook
  useSecurity(() => {
    // Clear messages from memory for security
    // Note: This is handled internally by the security hook
  });

  const headerHeight = useHeaderHeight(); // Get header height for KAV offset

  // Legacy pickAndSendPhoto function that uses the new hook
  const pickAndSendPhotoLegacy = async () => {
    await pickAndSendPhoto(handleSendPhoto);
  };

  // Legacy handleTyping function that uses the new hook
  const handleTypingLegacy = (text: string) => {
    handleTyping(text, setNewMessage);
  };

  // --- Loading State ---
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // --- Main Return JSX with new components ---
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <MessageList
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        flatListRef={flatListRef}
        onLoadMore={loadMoreMessages}
      />
      <MessageInput
        newMessage={newMessage}
        isSending={isSending}
        onTextChange={handleTypingLegacy}
        onSendMessage={handleSendMessage}
        onPickPhoto={pickAndSendPhotoLegacy}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;