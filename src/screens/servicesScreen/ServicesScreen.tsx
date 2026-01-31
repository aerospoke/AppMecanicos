import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { styles } from './ServicesScreen.styles';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { createServiceRequest } from '../../services/supabaseService';
import { sendPushToMechanics } from '../../services/notificationService';

type ServiceItem = {
	type: string;
	icon: React.ComponentProps<typeof MaterialIcons>['name'];
	desc: string;
	desc2: string;
	image: any; // ImageSourcePropType, kept as any to avoid RN type import
};

export default function ServicesScreen() {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
	const services: ServiceItem[] = useMemo(
		() => [
			{
				type: 'Cambio de Llanta',
				icon: 'build',
				desc: 'Cambio o reparación de llantas',
				desc2:
					"¿Tu llanta decidió 'tomar una siesta' en medio del camino? A veces el asfalto muerde, pero no te preocupes, nosotros traemos la curita (y el gato hidráulico).",
				image: require('../../../assets/wheel-flat.png'),
			},
			{
				type: 'Batería Descargada',
				icon: 'battery-alert',
				desc: 'Auxilio con batería',
				desc2:
					"¿Tu batería se declaró en huelga de brazos caídos? Dale, que todos tenemos días de 'baja energía'. Nosotros llegamos con los cables mágicos para revivirla como en las películas. ¡Frankenstein estaría orgulloso!",
				image: require('../../../assets/electric-damage.png'),
			},
			{
				type: 'Falta de Gasolina',
				icon: 'local-gas-station',
				desc: 'Servicio de gasolina',
				desc2:
					'¿El tanque decidió hacer dieta sin avisarte? Tranquilo, hasta los mejores olvidan parar en la gasolinera. Te llevamos combustible para que tu auto deje de hacerse el dramático.',
				image: require('../../../assets/without-gasoline.png'),
			},
			{
				type: 'Remolque',
				icon: 'local-shipping',
				desc: 'Servicio de grúa',
				desc2:
					"¿Tu auto dijo 'hoy no me levanto de la cama'? A veces necesitan un taxi VIP. Nuestra grúa lo llevará con todo el glamour que merece, como una estrella de cine en su limusina.",
				image: require('../../../assets/grua.png'),
			},
			{
				type: 'Revisión General',
				icon: 'search',
				desc: 'Diagnóstico del vehículo',
				desc2:
					'¿Tu auto suena como orquesta desafinada? Ruidos, vibraciones, lucecitas misteriosas... Somos los detectives de motores. CSI Automotriz a tu servicio.',
				image: require('../../../assets/engine-dmaged.png'),
			},
			{
				type: 'Otro',
				icon: 'help-outline',
				desc: 'Otro tipo de servicio',
				desc2:
					'¿Tu problema es tan único que ni Google lo entiende? ¡Nos encantan los retos! Cuéntanos qué locura le pasó a tu auto y lo resolveremos juntos. Nada nos asusta... bueno, casi nada.',
				image: require('../../../assets/not-idea-error.png'),
			},
		],
		[]
	);

	const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
	const [notes, setNotes] = useState('');
	const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
	const [submitting, setSubmitting] = useState(false);

		// Obtener ubicación al montar
		useEffect(() => {
			let mounted = true;
			(async () => {
				try {
					const { status } = await Location.requestForegroundPermissionsAsync();
					if (status === 'granted') {
						try {
							const location = await Location.getCurrentPositionAsync({
								accuracy: Location.Accuracy.High,
							});
							if (!mounted) return;
							setCurrentLocation({
								latitude: location.coords.latitude || 4.711,
								longitude: location.coords.longitude || -74.0721,
							});
						} catch (err) {
							// Fallback a Bogotá
							if (!mounted) return;
							setCurrentLocation({ latitude: 4.711, longitude: -74.0721 });
						}
					} else {
						setCurrentLocation({ latitude: 4.711, longitude: -74.0721 });
					}
				} catch (e) {
					setCurrentLocation({ latitude: 4.711, longitude: -74.0721 });
				}
			})();
			return () => { mounted = false; };
		}, []);

	const handleSelect = (service: ServiceItem) => {
		setSelectedService(service);
	};

	const handleBackToList = () => {
		setSelectedService(null);
		setNotes('');
	};

	const handleSubmit = () => {
		(async () => {
			if (!selectedService) return;
			// Fallback a ubicación por defecto si no hay ubicación actual
			const usingDefaultLocation = !currentLocation;
			const coords = currentLocation ?? { latitude: 4.711, longitude: -74.0721 };


			try {
				setSubmitting(true);
				const description = notes || selectedService.desc;
				const { data, error } = await createServiceRequest({
					service_name: selectedService.type,
					service_description: description,
					service_type: 'emergency',
					latitude: coords.latitude,
					longitude: coords.longitude,
				});

				if (error || !data) {
					Alert.alert('Error', 'No se pudo crear la solicitud');
					setSubmitting(false);
					return;
				}

				await sendPushToMechanics(
					'🔔 Hay un nuevo servicio disponible',
					'Hay un nuevo servicio disponible',
					{ serviceId: data.id, type: selectedService.type }
				);
				handleBackToList();
				navigation.goBack();
				
			} catch (e) {
				console.error('Error creando servicio desde ServicesScreen:', e);
				Alert.alert('Error', 'Ocurrió un error al crear la solicitud');
			} finally {
				setSubmitting(false);
			}
		})();
	};

	if (selectedService) {
		return (
			<View style={styles.container}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={handleBackToList}>
						<MaterialIcons name="arrow-back" size={24} color="#6b7280" />
					</TouchableOpacity>
					<Text style={styles.modalTitle}>{selectedService.type}</Text>
					<View style={styles.headerRight} />
				</View>

				<ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
					<Image source={selectedService.image} style={styles.detailImage} resizeMode="contain" />
					<View style={styles.detailTextBlock}>
						<Text style={styles.serviceName}>{selectedService.type}</Text>
						<Text style={styles.serviceDesc}>{selectedService.desc}</Text>
						<Text style={styles.serviceDesc2}>{selectedService.desc2}</Text>
					</View>

					<View style={styles.formBlock}>
						<Text style={styles.inputLabel}>Describe brevemente el problema</Text>
						<TextInput
							style={styles.textArea}
							multiline
							numberOfLines={4}
							placeholder="Ej: Pinchazo en la llanta delantera derecha, cerca de la salida 12."
							placeholderTextColor="#9ca3af"
							value={notes}
							onChangeText={setNotes}
						/>

						<TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
							<Text style={styles.primaryButtonText}>Confirmar servicio</Text>
							<MaterialIcons name="chevron-right" size={20} color="#fff" />
						</TouchableOpacity>
					</View>
				</ScrollView>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.modalHeader}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<MaterialIcons name="arrow-back" size={24} color="#6b7280" />
				</TouchableOpacity>
				<Text style={styles.modalTitle}>¿Qué servicio necesitas?</Text>
				<View style={styles.headerRight} />
			</View>

			<ScrollView style={styles.serviceList}>
				{services.map((service, index) => (
					<TouchableOpacity key={index} style={styles.serviceOption} onPress={() => handleSelect(service)}>
						<MaterialIcons style={styles.materialIcon} name={service.icon} size={32} color="#306bd3ff" />
						<View style={styles.serviceInfo}>
							<Text style={styles.serviceName}>{service.type}</Text>
							<Text style={styles.serviceDesc}>{service.desc}</Text>
						</View>
						<MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
					</TouchableOpacity>
				))}
			</ScrollView>
		</View>
	);
}

 

