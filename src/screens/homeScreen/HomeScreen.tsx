import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ButtonActionHome from '../../components/buttonActionHome/buttonActionHome';
import ButtonProfile from '../../components/buttonProfile/buttonProfile';
import PrincipalMap from '../../components/principalMap/principalMap';

export default function HomeScreen() {
  const { userRole, user } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, paddingBottom: 16 }}>

      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          Bienvenido, {user?.user_metadata?.nombre || 'Usuario'}
        </Text>
      </View>
      <PrincipalMap/>
      <ButtonActionHome/>
      <ButtonProfile/>
    </SafeAreaView>
  )
}    
