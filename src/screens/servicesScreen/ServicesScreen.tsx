import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { styles } from './ServicesScreen.styles';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { createServiceRequest, getAll } from '../../services/supabaseService';
import resolveServiceImage from '../../utils/serviceImage';
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
	// Lista por defecto (fallback) si falla la carga desde Supabase
	const defaultServices: ServiceItem[] = [];

	const [services, setServices] = useState<ServiceItem[]>(defaultServices);

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

	// Cargar catálogo de servicios desde Supabase
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const { data, error } = await getAll<any>('services_catalog');
				if (error || !data) throw error || new Error('No data');

				const active = data.filter((row: any) => row.is_active !== false);
				const sorted = active.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
				const mapped: ServiceItem[] = sorted.map((row: any) => ({
					type: row.type,
					icon: row.icon as React.ComponentProps<typeof MaterialIcons>['name'],
					desc: row.desc || '',
					desc2: row.desc2 || '',
					image: resolveServiceImage(row.image_key, row.image_url),
				}));

				if (mounted && mapped.length > 0) {
					setServices(mapped);
				}
			} catch (e) {
				// Mantener fallback por defecto
				console.warn('Fallo al cargar services_catalog, usando fallback local');
				if (mounted) setServices(defaultServices);
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

				Alert.alert('¡Solicitud Creada!', 'Un mecánico cercano será notificado', [
					{ text: 'OK', onPress: () => {
						handleBackToList();
						navigation.goBack();
					}}
				]);
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
					{selectedService.image && (
						<Image source={selectedService.image} style={styles.detailImage} resizeMode="contain" />
					)}
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

 

