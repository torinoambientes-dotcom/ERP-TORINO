'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Cloud, CloudRain, CloudSun, CloudDrizzle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeatherData {
  day: string;
  Icon: React.ElementType;
  temp: number;
  condition: string;
}

const placeholderWeatherData: WeatherData[] = [
  { day: format(addDays(new Date(), 0), 'eee', { locale: ptBR }), Icon: Sun, temp: 28, condition: 'Limpo' },
  { day: format(addDays(new Date(), 1), 'eee', { locale: ptBR }), Icon: CloudSun, temp: 26, condition: 'Parcialmente Nublado' },
  { day: format(addDays(new Date(), 2), 'eee', { locale: ptBR }), Icon: Cloud, temp: 22, condition: 'Nublado' },
  { day: format(addDays(new Date(), 3), 'eee', { locale: ptBR }), Icon: CloudDrizzle, temp: 20, condition: 'Garoa' },
  { day: format(addDays(new Date(), 4), 'eee', { locale: ptBR }), Icon: CloudRain, temp: 19, condition: 'Chuva' },
];

export function WeatherSlide() {
  return (
    <div className="h-full flex flex-col justify-center items-center">
      <h2 className="text-4xl font-bold text-center mb-8">Previsão do Tempo</h2>
      <Card className="bg-gray-800/80 border-primary/50 w-full max-w-6xl h-[60vh]">
        <CardHeader>
          <CardTitle className="text-primary">Próximos 5 Dias</CardTitle>
        </CardHeader>
        <CardContent className="h-[85%] flex items-center justify-around">
          {placeholderWeatherData.map((weather, index) => (
            <div key={index} className="flex flex-col items-center gap-4 text-center">
              <p className="text-2xl font-semibold capitalize">{weather.day}</p>
              <weather.Icon className="h-24 w-24 text-amber-300" />
              <p className="text-5xl font-bold">{weather.temp}°</p>
              <p className="text-lg text-gray-300">{weather.condition}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-gray-500 mt-2">*Dados de previsão do tempo são ilustrativos. É necessária integração com API externa.</p>
    </div>
  );
}
