import { View, Text } from 'react-native';
import { AdminAudioScreen } from '../src/screens/AdminAudioScreen';

/**
 * /admin route — renders AdminAudioScreen in development builds only.
 * In production builds this route renders a blank screen.
 */
export default function AdminRoute() {
  if (!__DEV__) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f4f1eb', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#7a7670' }}>Not available in production builds.</Text>
      </View>
    );
  }
  return <AdminAudioScreen />;
}
