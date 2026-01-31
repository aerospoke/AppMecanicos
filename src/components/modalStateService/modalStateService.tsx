import { TouchableOpacity, Text, View, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import styles from "./modalStateService.styles";

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
        case "cancelled":
            return 5;
        case "rejected":
            return 1;
        default:
            return 1;
    }
};

type ModalStateServiceProps = {
    visible: boolean;
    status?: string;
    onClose: () => void;
};

export default function ModalStateService({ visible, status, onClose }: ModalStateServiceProps) {
    // Determina el paso actual según el status
    const currentStep = statusToStep(status);

    const steps = [
        { id: 1, title: "Solicitud Creada", description: "Tu solicitud ha sido enviada, estamos notificando a los mecánicos cercanos", icon: "check-circle" as const },
        { id: 2, title: "Mecánico Asignado", description: "Un mecánico ha aceptado tu servicio", icon: "search" as const },
        { id: 3, title: "En Progreso", description: "El mecánico ha notificado que está trabajando en el problema", icon: "person" as const },
        { id: 4, title: "En Camino", description: "El mecánico se dirige hacia tu ubicación", icon: "directions-car" as const },
        { id: 5, title: "Servicio Cancelado", description: "El servicio ha sido cancelado", icon: "cancel" as const },
    ];

    const currentStepData = steps.find(step => step.id === currentStep);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
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
                            {step.id < 4 && (
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
                        name={currentStepData?.icon}
                        size={64}
                        color={currentStep <= currentStep ? "#306bd3" : "#9ca3af"}
                    />
                    <Text style={styles.stepTitle}>{currentStepData?.title}</Text>
                    <Text style={styles.stepDescription}>{currentStepData?.description}</Text>
                </View>

                {/* Botón de cerrar */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}