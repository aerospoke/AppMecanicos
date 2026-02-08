import { TouchableOpacity, Text, View, Modal, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import styles from "./modalStateService.styles";
import { updateServiceRequestStatus } from "../../services/supabaseService";
import { useAuth } from "../../context/AuthContext";

// Mapea el status de la base de datos a un paso del modal
const statusToStep = (status: string | undefined): number => {
   
    
    switch (status) {
        case "pending":
            return 1;
        case "accepted":
            return 2;
        case "in_progress":
            return 3;
        case "completed":
            return 4;
        default:
            return 1;
    }
};

type ModalStateServiceProps = {
    visible: boolean;
    status?: string;
    serviceRequest?: any;
    onClose: () => void;
};

export default function ModalStateService({ visible, status,serviceRequest, onClose }: ModalStateServiceProps) {
    const { userRole, user } = useAuth();
    // Determina el paso actual según el status
    const currentStep = statusToStep(status);
    
    const stepMechanic = [
        { id: 1, title: "Servicio Aceptado", description: "Confirmar asistencia", icon: "done-all" as const },
        { id: 2, title: "Llegada Confirmada", description: "Confirmar llegada al lugar", icon: "done-all" as const },
        { id: 3, title: "Servicio Completado", description: "Confirmar servicio completado", icon: "done-all" as const },
        
    ]

    
    const currentStepData = stepMechanic.find(step => step.id === currentStep);

    const handleCancelService = async () => {
        if (!serviceRequest?.id) {
            Alert.alert('Error', 'No se encontró el ID del servicio.');
            return;
        }

        Alert.alert(
            'Cancelar Servicio',
            '¿Estás seguro de que deseas cancelar este servicio?' + '\n' +'\n' +
            'Esto afectará tu reputación y posibilidad de recibir futuros nuevos servicios.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { data, error } = await updateServiceRequestStatus(serviceRequest.id, 'cancelled');

                            if (error) {
                                console.error('Error cancelando servicio:', error);
                                Alert.alert('Error', 'No se pudo cancelar el servicio');
                                return;
                            }

                            onClose() 
                            
                        } catch (error) {
                            console.error('Error en handleCancelService:', error);
                            Alert.alert('Error', 'Ocurrió un error al cancelar el servicio');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View 
            style={[
                styles.modalOverlay, 
                { display: visible ? 'flex' : 'none' }
            ]}
        >
            <View style={styles.container}>
            </View>
             
        </View>
    );
}