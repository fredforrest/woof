import { useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface UseTypingIndicatorReturn {
  handleTyping: (text: string, onTextChange: (text: string) => void) => void;
}

export const useTypingIndicator = (roomId: string): UseTypingIndicatorReturn => {
  const isTyping = useRef(false);
  const isTypingTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentUser = auth().currentUser;

  const handleTyping = (text: string, onTextChange: (text: string) => void) => {
    // Set message without sanitizing on every keystroke
    onTextChange(text);

    if (!isTyping.current) {
      isTyping.current = true;
      // Notify others that the user is typing
      firestore()
        .collection('chatRooms')
        .doc(roomId)
        .update({ [`typing.${currentUser?.uid}`]: true })
        .catch(error => {
          console.error('Error updating typing status:', error);
        });
    }

    if (isTypingTimeout.current) {
      clearTimeout(isTypingTimeout.current);
    }

    isTypingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      // Notify others that the user stopped typing
      firestore()
        .collection('chatRooms')
        .doc(roomId)
        .update({ [`typing.${currentUser?.uid}`]: false })
        .catch(error => {
          console.error('Error updating typing status:', error);
        });
    }, 2000); // Reset typing state after 2 seconds of inactivity
  };

  return {
    handleTyping,
  };
};
