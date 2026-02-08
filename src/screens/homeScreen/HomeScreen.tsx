import { useAuth } from '../../context/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ButtonActionHome from '../../components/buttonActionHome/buttonActionHome';
import ButtonProfile from '../../components/buttonProfile/buttonProfile';
import PrincipalMap from '../../components/principalMap/principalMap';
import ModalStateService from '../../components/modalStateService/modalStateService';
import { useServiceRequestListener } from '../../services/useServiceRequestListener';
import React from 'react';
import ModalStateServiceMechanic from '../../components/modalStateService/modalStateServiceMechanic';

const HomeScreen: React.FC = () => {
  const { userRole, user } = useAuth();
  const serviceRequest = userRole === "usuario" ? useServiceRequestListener() : null;
  const [modalVisible, setModalVisible] = React.useState(false);

  // Mostrar el modal cuando haya una solicitud activa
  React.useEffect(() => {

    if (serviceRequest && serviceRequest.status !== 'completed' && serviceRequest.status !== 'cancelled') {
      setModalVisible(true);
    } else {
      setModalVisible(false);
    }
  }, [serviceRequest]);

  return (
    <SafeAreaView style={{ flex: 1, }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          Bienvenido, {user?.user_metadata?.nombre || 'Usuario'}
        </Text>
      </View>
      <PrincipalMap modalVisible={modalVisible} />

      {!modalVisible && <ButtonActionHome modalVisible={modalVisible} />}

      {userRole === 'usuario' &&
        <ModalStateService
          visible={modalVisible}
          status={serviceRequest?.status}
          serviceRequest={serviceRequest}
          onClose={() => setModalVisible(false)}
        />
      }

      {userRole === 'mecanico' &&
        <ModalStateServiceMechanic
          visible={modalVisible}
          status={serviceRequest?.status}
          serviceRequest={serviceRequest}
          onClose={() => setModalVisible(false)}
        />
      }

    </SafeAreaView>
  );
};

export default HomeScreen;