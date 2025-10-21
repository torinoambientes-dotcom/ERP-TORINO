'use server';
/**
 * @fileOverview A weather forecasting AI agent.
 *
 * - getWeatherForecast - A function that handles the weather forecast process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DailyForecastSchema = z.object({
    day: z.string().describe("The day of the week, abbreviated (e.g., 'Seg')."),
    temp: z.number().describe("The temperature in Celsius."),
    condition: z.string().describe("A brief description of the weather condition (e.g., 'Céu Limpo')."),
    icon: z.string().describe("An icon code representing the weather condition (e.g., '01d')."),
});

const WeatherForecastOutputSchema = z.object({
    forecasts: z.array(DailyForecastSchema).describe("An array of daily weather forecasts for the next 5 days."),
});

export type WeatherForecastOutput = z.infer<typeof WeatherForecastOutputSchema>;

// Coordinates for Guaramirim, SC, Brazil
const GUARAMIRIM_LAT = -26.4742;
const GUARAMIRIM_LON = -49.0039;

// Mapping from OpenWeather icon codes to our simplified conditions and Lucide icons
const conditionMap: { [key: string]: { condition: string } } = {
    '01d': { condition: 'Céu Limpo' },
    '01n': { condition: 'Céu Limpo' },
    '02d': { condition: 'Parcial. Nublado' },
    '02n': { condition: 'Parcial. Nublado' },
    '03d': { condition: 'Nublado' },
    '03n': { condition: 'Nublado' },
    '04d': { condition: 'Nublado' },
    '04n': { condition: 'Nublado' },
    '09d': { condition: 'Chuva Leve' },
    '09n': { condition: 'Chuva Leve' },
    '10d': { condition: 'Chuva' },
    '10n': { condition: 'Chuva' },
    '11d': { condition: 'Trovoadas' },
    '11n': { condition: 'Trovoadas' },
    '13d': { condition: 'Neve' },
    '13n': { condition: 'Neve' },
    '50d': { condition: 'Névoa' },
    '50n': { condition: 'Névoa' },
};

const portugueseDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];


export async function getWeatherForecast(): Promise<WeatherForecastOutput> {
    return getWeatherForecastFlow();
}

const getWeatherForecastFlow = ai.defineFlow(
  {
    name: 'getWeatherForecastFlow',
    inputSchema: z.void(),
    outputSchema: WeatherForecastOutputSchema,
  },
  async () => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenWeather API key is not configured.');
    }
    
    // Using OpenWeatherMap's One Call API 3.0
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${GUARAMIRIM_LAT}&lon=${GUARAMIRIM_LON}&exclude=current,minutely,hourly,alerts&appid=${apiKey}&units=metric&lang=pt_br`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching weather data: ${response.statusText}`);
        }
        const data = await response.json();

        const forecasts: z.infer<typeof DailyForecastSchema>[] = data.daily.slice(0, 5).map((day: any) => {
            const date = new Date(day.dt * 1000);
            const dayOfWeek = portugueseDays[date.getUTCDay()];
            const weatherIcon = day.weather[0].icon;
            const mappedCondition = conditionMap[weatherIcon]?.condition || day.weather[0].description;

            return {
                day: dayOfWeek,
                temp: Math.round(day.temp.day),
                condition: mappedCondition,
                icon: weatherIcon,
            };
        });

        return { forecasts };

    } catch (error) {
        console.error("Failed to fetch or process weather data", error);
        // Return a default or empty forecast in case of error
        return { forecasts: [] };
    }
  }
);
