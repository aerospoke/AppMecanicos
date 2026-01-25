import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import PrincipalMap from '../components/principalMap/principalMap';
import { registerForPushNotificationsAsync, sendPushToAll } from '../services/notificationService';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError(error: any) {
		return { hasError: true, error };
	}
	render() {
		if (this.state.hasError) {
			return (
				<View style={styles.cardError}>
					<Text style={styles.cardTitle}>Mapa</Text>
					<Text style={styles.fail}>Fallo al renderizar el mapa</Text>
					<Text style={styles.small}>{String(this.state.error)}</Text>
				</View>
			);
		}
		return this.props.children as any;
	}
}

type Check = {
	label: string;
	status: 'pending' | 'ok' | 'fail';
	detail?: string;
};

export default function PruebasScreen() {
	const { user } = useAuth();
	const [pushToken, setPushToken] = useState<string | null>(null);
	const [dbToken, setDbToken] = useState<string | null>(null);
	const [tokenStatus, setTokenStatus] = useState<string>('Pendiente');
	const [sendAllStatus, setSendAllStatus] = useState<string>('—');
	const [checks, setChecks] = useState<Record<string, Check>>({
		locationPermission: { label: 'Permiso de ubicación', status: 'pending' },
		currentLocation: { label: 'Ubicación actual obtenida', status: 'pending' },
		mapReady: { label: 'Google Maps cargó correctamente', status: 'pending' },
	});

	const [location, setLocation] = useState<Location.LocationObject | null>(null);
	const [initialRegion, setInitialRegion] = useState<Region | null>(null);
	const mapReadyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		let canceled = false;
		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (canceled) return;
				if (status !== 'granted') {
					setChecks((prev) => ({
						...prev,
						locationPermission: {
							...prev.locationPermission,
							status: 'fail',
							detail: 'Permiso denegado. Otórgalo en ajustes.',
						},
						currentLocation: {
							...prev.currentLocation,
							status: 'fail',
							detail: 'Sin permisos de ubicación',
						},
					}));
					return;
				}
				setChecks((prev) => ({
					...prev,
					locationPermission: { ...prev.locationPermission, status: 'ok', detail: 'Concedido' },
				}));

				const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
				if (canceled) return;
				setLocation(loc);
				setChecks((prev) => ({
					...prev,
					currentLocation: {
						...prev.currentLocation,
						status: 'ok',
						detail: `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`,
					},
				}));
				setInitialRegion({
					latitude: loc.coords.latitude,
					longitude: loc.coords.longitude,
					latitudeDelta: 0.02,
					longitudeDelta: 0.02,
				});
			} catch (e: any) {
				if (canceled) return;
				setChecks((prev) => ({
					...prev,
					locationPermission: { ...prev.locationPermission, status: 'fail', detail: 'Error pidiendo permisos' },
					currentLocation: { ...prev.currentLocation, status: 'fail', detail: String(e?.message || e) },
				}));
			}
		})();
		return () => {
			canceled = true;
			if (mapReadyTimeout.current) clearTimeout(mapReadyTimeout.current);
		};
	}, []);

	const loadDbToken = async () => {
		if (!user?.id) return;
		try {
			const { data, error } = await supabase
				.from('profiles')
				.select('push_token')
				.eq('id', user.id)
				.single();
			if (error) {
				setTokenStatus('Error leyendo BD: ' + error.message);
			} else {
				setDbToken(data?.push_token || null);
				setTokenStatus(data?.push_token ? 'Token en BD' : 'Sin token en BD');
			}
		} catch (e: any) {
			setTokenStatus('Excepción BD: ' + (e?.message || String(e)));
		}
	};

	const obtainToken = async () => {
		setTokenStatus('Solicitando permisos y token...');
		const token = await registerForPushNotificationsAsync();
		if (token) {
			setPushToken(token);
			setTokenStatus('Token obtenido');
		} else {
			setTokenStatus('No se obtuvo token');
		}
	};

	const saveTokenToDb = async () => {
		if (!user?.id || !pushToken) {
			setTokenStatus('Falta user o token');
			return;
		}
		const { error } = await supabase
			.from('profiles')
			.update({ push_token: pushToken })
			.eq('id', user.id);
		if (error) {
			setTokenStatus('Error guardando en BD: ' + error.message);
		} else {
			setTokenStatus('Token guardado en BD');
			await loadDbToken();
		}
	};

	const sendPushAll = async () => {
		setSendAllStatus('Enviando...');
		const res = await sendPushToAll(
			'🔔 Prueba: push para todos',
			'Mensaje de prueba enviado a todos los tokens registrados',
			{ screen: 'Pruebas', type: 'broadcast-test' }
		);
		if ((res as any)?.success) {
			setSendAllStatus('✅ Enviado');
		} else {
			setSendAllStatus('❌ Falló');
		}
	};

	// If the map doesn't report ready in time, fail the check
	useEffect(() => {
		if (checks.mapReady.status === 'pending') {
			mapReadyTimeout.current = setTimeout(() => {
				setChecks((prev) => ({
					...prev,
					mapReady: {
						...prev.mapReady,
						status: prev.mapReady.status === 'pending' ? 'fail' : prev.mapReady.status,
						detail: prev.mapReady.status === 'pending' ? 'Tiempo excedido esperando al mapa' : prev.mapReady.detail,
					},
				}));
			}, 8000);
		}
		return () => {
			if (mapReadyTimeout.current) clearTimeout(mapReadyTimeout.current);
		};
	}, [checks.mapReady.status]);

	const regionToUse = useMemo<Region>(() => {
		return (
			initialRegion || {
				latitude: -34.6037,
				longitude: -58.3816,
				latitudeDelta: 0.05,
				longitudeDelta: 0.05,
			}
		);
	}, [initialRegion]);

	const allOk =
		checks.locationPermission.status === 'ok' &&
		checks.currentLocation.status === 'ok' &&
		checks.mapReady.status === 'ok';

	return (
		<SafeAreaView style={{ flex: 1 }}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.header}>Diagnóstico de Home / Mapa</Text>
				<View style={styles.row}>
					<Text style={styles.key}>Plataforma:</Text>
					<Text style={styles.value}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
				</View>

				<View style={styles.card}>
					<Text style={styles.cardTitle}>Checks</Text>
					{Object.entries(checks).map(([key, c]) => (
						<View key={key} style={styles.checkRow}>
							<Text style={[styles.badge, c.status === 'ok' ? styles.badgeOk : c.status === 'fail' ? styles.badgeFail : styles.badgePending]}>
								{c.status === 'ok' ? 'OK' : c.status === 'fail' ? 'FALLO' : '...'}
							</Text>
							<Text style={styles.checkLabel}>{c.label}</Text>
							{!!c.detail && <Text style={styles.detail}>· {c.detail}</Text>}
						</View>
					))}
				</View>

				<View style={styles.card}>
					<Text style={styles.cardTitle}>Mapa de prueba (directo)</Text>
					<ErrorBoundary>
						<View style={{ height: 220, borderRadius: 8, overflow: 'hidden' }}>
							<MapView
								provider={PROVIDER_GOOGLE}
								style={{ flex: 1 }}
								initialRegion={regionToUse}
								onMapReady={() =>
									setChecks((prev) => ({
										...prev,
										mapReady: { ...prev.mapReady, status: 'ok', detail: 'onMapReady recibido' },
									}))
								}
							>
								{location && (
									<Marker
										coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
										title="Tu ubicación"
									/>
								)}
							</MapView>
						</View>
					</ErrorBoundary>
				</View>

				<View style={styles.card}>
					<Text style={styles.cardTitle}>Mapa como en Home</Text>
					<View style={{ height: 220, borderRadius: 8, overflow: 'hidden' }}>
						<PrincipalMap
							height={220}
							initialRegion={regionToUse}
							markers={
								location
									? [
											{
												latitude: location.coords.latitude,
												longitude: location.coords.longitude,
												title: 'Aquí',
												description: 'Ubicación actual',
											},
										]
									: undefined
							}
						/>
					</View>
				</View>

				<View style={[styles.card, { marginBottom: 24 }]}>
					<Text style={styles.cardTitle}>Resultado</Text>
					{allOk ? (
						<Text style={styles.ok}>Todo listo: el mapa debería prender en Home.</Text>
					) : (
						<Text style={styles.warn}>Faltan checks en verde para garantizar el mapa.</Text>
					)}
				</View>

				<View style={[styles.card, { marginBottom: 24 }]}>
					<Text style={styles.cardTitle}>Pruebas de Push Token</Text>
					<View style={styles.row}>
						<Text style={styles.key}>Estado:</Text>
						<Text style={styles.value}>{tokenStatus}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.key}>Token (local):</Text>
						<Text style={styles.small}>{pushToken ? pushToken.substring(0, 48) + '...' : '—'}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.key}>Token en BD:</Text>
						<Text style={styles.small}>{dbToken ? dbToken.substring(0, 48) + '...' : '—'}</Text>
					</View>
					<View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
						<TouchableOpacity style={styles.btn} onPress={obtainToken}>
							<Text style={styles.btnText}>Obtener Token</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.btn} onPress={saveTokenToDb}>
							<Text style={styles.btnText}>Guardar en BD</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.btn} onPress={loadDbToken}>
							<Text style={styles.btnText}>Refrescar BD</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.btnSecondary} onPress={sendPushAll}>
							<Text style={styles.btnText}>Enviar a Todos</Text>
						</TouchableOpacity>
					</View>
					<View style={[styles.row, { marginTop: 8 }]}>
						<Text style={styles.key}>Broadcast:</Text>
						<Text style={styles.value}>{sendAllStatus}</Text>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		gap: 12,
	},
	header: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 4,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	key: {
		fontWeight: '600',
	},
	value: {
		color: '#333',
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 12,
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	cardError: {
		backgroundColor: '#fff5f5',
		borderRadius: 12,
		padding: 12,
		borderColor: '#ffb3b3',
		borderWidth: 1,
	},
	cardTitle: {
		fontWeight: '700',
		marginBottom: 8,
	},
	checkRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
		marginVertical: 4,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 8,
		overflow: 'hidden',
		fontWeight: '700',
		color: 'white',
		minWidth: 44,
		textAlign: 'center',
	},
	badgeOk: { backgroundColor: '#16a34a' },
	badgeFail: { backgroundColor: '#dc2626' },
	badgePending: { backgroundColor: '#2563eb' },
	checkLabel: {
		fontWeight: '600',
	},
	detail: {
		color: '#555',
	},
	ok: { color: '#166534', fontWeight: '600' },
	warn: { color: '#854d0e', fontWeight: '600' },
	fail: { color: '#991b1b', fontWeight: '600' },
	small: { color: '#555', fontSize: 12, marginTop: 4 },
	btn: {
		backgroundColor: '#2563eb',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
	},
	btnText: { color: '#fff', fontWeight: '700' },
	btnSecondary: {
		backgroundColor: '#059669',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
	},
});

