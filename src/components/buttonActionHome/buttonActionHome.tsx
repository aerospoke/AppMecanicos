//boton sencillo que valida el roleUSer y redirige a la pantalla correspondiente
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import styles from './buttonActionHome.styles';

type ButtonActionHomeProps = {
  title: string;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export default function ButtonActionHome() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { userRole } = useAuth();

  const title = userRole === 'mecanico' ? 'Dashboard' : 'Solicitar servicio';

  const handlePress = () => {
    if (userRole == 'mecanico') {
      navigation.navigate('MechanicDashboard');
    } else {
      navigation.navigate('Profile');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}