import * as Location from 'expo-location';

export type WeatherCondition = 'hot' | 'mild' | 'cold';

export async function getWeatherCondition(): Promise<WeatherCondition> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return 'mild'; // sensible default

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // Open-Meteo — free, no API key needed
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&temperature_unit=celsius`;
        const res = await fetch(url);
        const data = await res.json();

        const tempC: number = data.current?.temperature_2m ?? 20;

        if (tempC >= 25) return 'hot';
        if (tempC < 15) return 'cold';
        return 'mild';
    } catch {
        return 'mild'; // graceful fallback
    }
}
