import { Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { 
  getCurrentUser, 
  messageRateLimit, 
  validateImageFile, 
  validateFileSize, 
  handleSecureError 
} from '../utils/security';

interface UsePhotoPickerReturn {
  pickAndSendPhoto: (onPhotoSelected: (uri: string) => void) => Promise<void>;
}

export const usePhotoPicker = (): UsePhotoPickerReturn => {
  const pickAndSendPhoto = async (onPhotoSelected: (uri: string) => void) => {
    try {
      const user = getCurrentUser();
      
      // Check rate limit
      if (!messageRateLimit.canSendMessage(user.uid)) {
        Alert.alert('Rate Limit', 'Please wait before sending another message.');
        return;
      }

      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.7,
        },
        async response => {
          if (response.didCancel) return;
          if (response.errorCode) {
            handleSecureError(response.errorCode, 'Could not pick image.');
            return;
          }
          
          const uri = response.assets && response.assets[0]?.uri;
          if (!uri) return;

          // Validate image file
          const isValidImage = await validateImageFile(uri);
          const isValidSize = await validateFileSize(uri, 5); // 5MB limit

          if (!isValidImage) {
            Alert.alert('Invalid File', 'Please select a valid image (max 1024x1024px).');
            return;
          }

          if (!isValidSize) {
            Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
            return;
          }

          onPhotoSelected(uri);
        }
      );
    } catch (error) {
      handleSecureError(error, 'Could not access photo library.');
    }
  };

  return {
    pickAndSendPhoto,
  };
};
