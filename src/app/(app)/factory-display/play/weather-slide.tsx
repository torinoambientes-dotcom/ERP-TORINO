'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, CloudSun, CloudDrizzle, Loader, AlertTriangle, Snowflake, Zap, CloudFog } from 'lucide-react';
import { getWeatherForecast, type WeatherForecastOutput } from '@/ai/flows/weather-flow';


const iconMap: { [key: string]: React.ElementType } = {
  '01d': Sun,
  '01n': Sun, // Assuming moon icon is not available, using sun
  '02d': CloudSun,
  '02n': CloudSun,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloud,
  '04n': Cloud,
  '09d': CloudDrizzle,
  '09n': CloudDrizzle,
  '10d': CloudRain,
  '10n': CloudRain,
  '11d': Zap,
  '11n': Zap,
  '13d': Snowflake,
  '13n': Snowflake,
  '50d': CloudFog,
  '50n': CloudFog,
};


export function WeatherSlide() {
  const [weatherData, setWeatherData] = useState<WeatherForecastOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getWeatherForecast();
        if (data && data.forecasts.length > 0) {
            setWeatherData(data);
        } else {
            setError("Não foi possível obter a previsão do tempo. Verifique a chave de API.");
        }
      } catch (err) {
        console.error(err);
        setError("Ocorreu um erro ao buscar os dados do tempo.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, []);

  return (
    <div className="h-full flex flex-col justify-center items-center">
      <h2 className="text-4xl font-bold text-center mb-8">Previsão do Tempo (Guaramirim, SC)</h2>
      <Card className="bg-gray-800/80 border-primary/50 w-full max-w-6xl h-[60vh]">
        <CardHeader>
          <CardTitle className="text-primary">Próximos 5 Dias</CardTitle>
        </CardHeader>
        <CardContent className="h-[85%] flex items-center justify-around">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 text-white">
                <Loader className="h-12 w-12 animate-spin" />
                <p>A carregar previsão do tempo...</p>
            </div>
          ) : error ? (
             <div className="flex flex-col items-center gap-4 text-amber-300">
                <AlertTriangle className="h-12 w-12" />
                <p className="font-semibold text-center max-w-sm">{error}</p>
            </div>
          ) : (
            weatherData?.forecasts.map((weather, index) => {
              const Icon = iconMap[weather.icon] || Cloud;
              return (
                <div key={index} className="flex flex-col items-center gap-4 text-center">
                  <p className="text-2xl font-semibold capitalize">{weather.day}</p>
                  <Icon className="h-24 w-24 text-amber-300" />
                  <p className="text-5xl font-bold">{weather.temp}°</p>
                  <p className="text-lg text-gray-300">{weather.condition}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      {!isLoading && !error && (
        <p className="text-xs text-gray-500 mt-2">Powered by OpenWeatherMap</p>
      )}
    </div>
  );
}
