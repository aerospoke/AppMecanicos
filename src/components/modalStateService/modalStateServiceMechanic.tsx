import { TouchableOpacity, Text, View, Modal, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocationContext } from '../../context/LocationContext';
import styles from "./modalStateService.styles";
import { updateServiceRequestStatus } from "../../services/supabaseService";
import { useAuth } from "../../context/AuthContext";

// Mapea el status de la base de datos a un paso del modal
const statusToStep = (status: string | undefined): number => {

    switch (status) {
        case "pending":
            return 0;
        case "accepted":
            return 1;
        case "in_progress":
            return 2;
        case "completed":
            return 3;
        default:
            return 0;
    }
};

type ModalStateServiceProps = {
    visible: boolean;
    status?: string;
    serviceRequest?: any;
    onClose: () => void;
};

const ModalStateServiceMechanic = ({
    visible,
    status,
    serviceRequest,
    onClose,
}: ModalStateServiceProps) => {
    console.log("🚀 ~ ModalStateServiceMechanic ~ serviceRequest:", serviceRequest)
    console.log("🚀 ~ ModalStateServiceMechanic ~ status:", status)

    const { userRole, user } = useAuth();
    const { location } = useLocationContext();
    const currentStep = statusToStep(status);

    const stepMechanic = [
        { id: 0, title: "Aceptar Servicio", description: "Esperando aceptación de un mecánico", icon: "hourglass-empty" as const },
        { id: 1, title: "Servicio Aceptado", description: "Confirmar asistencia", icon: "done-all" as const },
        { id: 2, title: "Llegada Confirmada", description: "Confirmar llegada al lugar", icon: "done-all" as const },
        { id: 3, title: "Servicio Completado", description: "Confirmar servicio completado", icon: "done-all" as const },
    ];

    const currentStepData = stepMechanic.find(step => step.id === currentStep);

    const acceptService = async () => {
        if (!serviceRequest?.id) {
            Alert.alert('Error', 'No se encontró el ID del servicio.');
            return;
        }

        try {
            const { data, error } = await updateServiceRequestStatus(serviceRequest.id, 'accepted');

            if (error) {
                console.error('Error aceptando servicio:', error);
                Alert.alert('Error', 'No se pudo aceptar el servicio');
                return;
            }

        } catch (error) {
            console.error('Error en acceptService:', error);
            Alert.alert('Error', 'Ocurrió un error al aceptar el servicio');
        }
    }

    // Calcular distancia en km entre el mecánico y el servicio
    function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    let distanciaKm: string | null = null;
    let tiempoMin: string | null = null;
    if (
        location &&
        serviceRequest &&
        serviceRequest.latitude &&
        serviceRequest.longitude
    ) {
        const dist = getDistanceKm(
            location.latitude,
            location.longitude,
            serviceRequest.latitude,
            serviceRequest.longitude
        );
        distanciaKm = dist.toFixed(2);
        // Suponiendo velocidad promedio urbana de 30 km/h
        const tiempo = dist / 30 * 60; // minutos
        tiempoMin = tiempo < 1 ? '<1' : tiempo.toFixed(0);
    }

    const handleCancelService = async () => {
        if (!serviceRequest?.id) {
            Alert.alert('Error', 'No se encontró el ID del servicio.');
            return;
        }

        Alert.alert(
            'Cancelar Servicio',
            '¿Estás seguro de que deseas cancelar este servicio?' + '\n' + '\n' +
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
                {/* Info distancia y tiempo */}
                {distanciaKm && tiempoMin && (
                    <View style={{ marginBottom: 16, alignItems: 'center' }}>
                        <Text style={{ fontWeight: 'bold', color: '#2563eb', fontSize: 16 }}>
                            Distancia al servicio: {distanciaKm} km
                        </Text>
                        <Text style={{ color: '#2563eb', fontSize: 15 }}>
                            Tiempo estimado de llegada: {tiempoMin} min
                        </Text>
                    </View>
                )}
                <View style={styles.buttonContainer}>
                    {currentStepData?.id === 0 && (
                        <TouchableOpacity style={styles.button} onPress={acceptService}>
                            <Text style={styles.buttonText}>Aceptar Servicio</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

        </View>
    );
};

export default ModalStateServiceMechanic;