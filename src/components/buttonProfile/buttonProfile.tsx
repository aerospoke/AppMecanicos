//boton sencillo que valida el roleUSer y redirige a la pantalla correspondiente
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import styles from './buttonProfile.styles';

type ButtonActionHomeProps = {
  title: string;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export default function ButtonProfile() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { userRole,user } = useAuth();

  console.log("🚀 ~ ButtonProfile ~ user:", user)


  const initialName = user?.user_metadata?.nombre.slice(0, 1).toUpperCase() || 'U';
  console.log("🚀 ~ ButtonProfile ~ initialName:", initialName)

  const handlePress = () => {
      navigation.navigate('Profile');
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.buttonText}>{initialName}</Text>
    </TouchableOpacity>
  );
}