import { useState } from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import styles from "./modalStateService.styles";

export default function ModalStateService() {
    const [currentStep, setCurrentStep] = useState(1);
    
    const steps = [
        { id: 1, title: "Solicitud Creada", description: "Tu solicitud ha sido enviada", icon: "check-circle" as const },
        { id: 2, title: "Buscando Mecánico", description: "Estamos notificando a los mecánicos cercanos", icon: "search" as const },
        { id: 3, title: "Mecánico Asignado", description: "Un mecánico ha aceptado tu servicio", icon: "person" as const },
        { id: 4, title: "En Camino", description: "El mecánico se dirige hacia tu ubicación", icon: "directions-car" as const },
    ];

    const nextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const currentStepData = steps.find(step => step.id === currentStep);

    return (
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

            {/* Botones de Navegación (para testing) */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={[styles.button, currentStep === 1 && styles.buttonDisabled]}
                    onPress={prevStep}
                    disabled={currentStep === 1}
                >
                    <Text style={styles.buttonText}>Anterior</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.button, currentStep === 4 && styles.buttonDisabled]}
                    onPress={nextStep}
                    disabled={currentStep === 4}
                >
                    <Text style={styles.buttonText}>Siguiente</Text>
                </TouchableOpacity>
            </View>
        </View>    
    );
}