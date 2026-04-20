import * as Location from 'expo-location';

export type WeatherCondition = 'hot' | 'mild' | 'cold' | 'windy';

export interface WeatherData {
    condition: WeatherCondition;
    temperature: number;
    locationName: string;
    description: string;
}

export async function fetchRawWeather(): Promise<WeatherData> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('No permission');

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // Get district or city (Expo native first)
        let locationName = '';
        try {
            const reverseGeo = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverseGeo && reverseGeo.length > 0) {
                const r = reverseGeo[0];
                locationName = r.city || r.district || r.region || r.subregion || r.name || '';
            }
        } catch (e) {
            // Ignore native failure
        }

        // Web Fallback: Nominatim OpenStreetMap
        if (!locationName || locationName.trim() === '') {
            try {
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                    { headers: { 'User-Agent': 'ChowaStyleBot/1.0' } }
                );
                const geoData = await geoRes.json();
                locationName = geoData.address?.city || geoData.address?.town || geoData.address?.county || geoData.address?.state || 'Current Location';
            } catch (e) {
                locationName = 'Current Location';
            }
        }

        // Open-Meteo with WMO code
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&temperature_unit=celsius`;
        const res = await fetch(url);
        const data = await res.json();

        const tempC: number = data.current?.temperature_2m ?? 20;
        const code: number = data.current?.weathercode ?? 0;

        let condition: WeatherCondition = 'mild';
        if (tempC >= 25) condition = 'hot';
        else if (tempC <= 12) condition = 'cold';
        else if (code >= 60) condition = 'cold'; // Rain/snow implies feeling colder

        // Basic WMO to String
        let desc = 'Clear';
        if (code === 1 || code === 2) desc = 'Partly Cloudy';
        else if (code === 3) desc = 'Overcast';
        else if (code >= 51 && code <= 67) desc = 'Rain';
        else if (code >= 71) desc = 'Snow';

        return {
            condition,
            temperature: Math.round(tempC),
            locationName,
            description: desc
        };

    } catch (e: any) {
        console.warn('Weather fetch failed', e);
        return {
            condition: 'mild',
            temperature: 20,
            locationName: 'Local',
            description: 'Unknown'
        };
    }
}
