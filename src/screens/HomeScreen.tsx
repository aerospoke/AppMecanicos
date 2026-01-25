import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text, SafeAreaView } from 'react-native';
import ButtonActionHome from '../components/buttonActionHome/buttonActionHome';
import ButtonProfile from '../components/buttonProfile/buttonProfile';




export default function HomeScreen() {
  const { userRole, user } = useAuth();
  console.log("🚀 ~ HomeScreen ~ userRole:", userRole)
  console.log("🚀 ~ HomeScreen ~ user:", user)


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text>hola</Text>
      </View>
      <ButtonActionHome/>
      <ButtonProfile/>
    </SafeAreaView>
  )
}    
