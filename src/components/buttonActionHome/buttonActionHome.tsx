//boton sencillo que valida el roleUSer y redirige a la pantalla correspondiente
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import styles from './buttonActionHome.styles';
import ButtonProfile from '../buttonProfile/buttonProfile';

type ButtonActionHomeProps = {
  modalVisible: boolean;
};

type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ButtonActionHome({ modalVisible }: ButtonActionHomeProps) {
  console.log("🚀 ~ ButtonActionHome ~ modalVisible:", modalVisible)
  const navigation = useNavigation<AppNavigationProp>();
  const { userRole } = useAuth();

  const cancellServiceRequest = () => {
    // Lógica para cancelar la solicitud de servicio
    console.log("🚀 ~ cancellServiceRequest ~ Solicitud de servicio cancelada");
  }

  let title = userRole === 'mecanico' ? 'Dashboard' : 'Solicitar servicio';

  if (userRole === 'mecanico' ) {
    title = 'Dashboard';
  } 
  
  if (userRole === 'usuario') {
    title = 'Solicitar servicio';

    if (modalVisible) {
      title = 'Cancelar solicitud';
    }
  } 


  const handlePress = () => {
    if (userRole === 'mecanico') {
      navigation.navigate('MechanicDashboard');
    } 
    
    
    console.log("🚀 ~ handlePress ~ userRole:", userRole)
    if (userRole === 'usuario') {
      navigation.navigate('Services');

      if (modalVisible) {
        cancellServiceRequest();
        return; 
      }
    }
  };
  return (
    <View style={styles.container}>

      <ButtonProfile />

      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
}