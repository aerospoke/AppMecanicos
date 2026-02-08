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
    
    const stepsUser = [
        { id: 1, title: "Solicitud Creada", description: "Notificando a mecánicos cercanos", icon: "check-circle" as const },
        { id: 2, title: "Mecánico Asignado", description: "Un mecánico ha aceptado tu servicio", icon: "search" as const },
        { id: 3, title: "En Progreso", description: "El mecánico trabaja en el caso", icon: "person" as const },
    ];
    
    
    const stepMechanic = [
        { id: 1, title: "Servicio Aceptado", description: "Confirmar asistencia", icon: "done-all" as const },
        { id: 2, title: "Llegada Confirmada", description: "Confirmar llegada al lugar", icon: "done-all" as const },
        { id: 3, title: "Servicio Completado", description: "Confirmar servicio completado", icon: "done-all" as const },
        
    ]

    const steps = userRole === 'mecanico' ? stepMechanic : stepsUser;
    
    const currentStepData = steps.find(step => step.id === currentStep);

    const handleCancelService = async () => {
        if (!serviceRequest?.id) {
            Alert.alert('Error', 'No se encontró el ID del servicio.');
            return;
        }

        Alert.alert(
            'Cancelar Servicio',
            '¿Estás seguro de que deseas cancelar este servicio?' + '\n' +'\n' +
            'Se cobrará una tarifa de cancelación si el mecánico ya está en camino.',
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
                <View style={styles.header}>
                    <Text style={styles.title}>Estado del Servicio</Text>
                </View>

                {/* Indicador de Pasos */}
                <View style={styles.stepIndicator}>
                    {steps.map((step) => (
                        <View key={step.id} style={styles.stepContainer}>
                            <View style={[
                                styles.stepCircle,
                                step.id <= currentStep ? styles.stepActive : styles.stepInactive
                            ]}>
                                <Text style={[
                                    styles.stepNumber,
                                    step.id <= currentStep ? styles.stepNumberActive : styles.stepNumberInactive
                                ]}>
                                    {step.id}
                                </Text>
                            </View>
                            {step.id < steps.length && (
                                <View style={[
                                    styles.stepLine,
                                    step.id < currentStep ? styles.stepLineActive : styles.stepLineInactive
                                ]} />
                            )}
                        </View>
                    ))}
                </View>

                {/* Contenido del Paso Actual */}
                <View style={styles.stepContent}>
                    <MaterialIcons
                     style={styles.stepIcon}
                        name={currentStepData?.icon}
                        size={64}
                        color={currentStep <= currentStep ? "#306bd3" : "#9ca3af"}
                    />
                    <View style={styles.stepDescriptionContainer}>
                        <Text style={styles.stepTitle}>{currentStepData?.title}</Text>
                        <Text style={styles.stepDescription}>{currentStepData?.description}</Text>
                    </View>
                </View>
                 
                {/* Botones de acción */}
                <View style={styles.buttonContainer}>
                    {currentStepData?.id === 4 ? (
                        // Botón de cerrar cuando el servicio está completado
                        <TouchableOpacity style={styles.button} onPress={onClose}>
                            <Text style={styles.buttonText}>Cerrar</Text>
                        </TouchableOpacity>
                    ) : (
                        // Botón de cancelar cuando el servicio está en progreso
                        <TouchableOpacity 
                            style={[styles.button, styles.buttonCancel]} 
                            onPress={handleCancelService}
                        >
                            <Text style={styles.buttonText}>Cancelar Servicio</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}