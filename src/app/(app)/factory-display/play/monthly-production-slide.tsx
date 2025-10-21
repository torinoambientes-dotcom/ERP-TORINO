'use client';
import { useContext, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppContext } from '@/context/app-context';
import { format, subMonths, getYear, getMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MonthlyProductionSlide() {
  const { projects } = useContext(AppContext);

  const monthlyProductionData = useMemo(() => {
    const months = Array.from({ length: 12 }).map((_, i) => {
        const date = subMonths(new Date(), i);
        return {
            name: format(date, 'MMM/yy', { locale: ptBR }),
            month: getMonth(date),
            year: getYear(date),
            Móveis_Finalizados: 0,
        };
    }).reverse();

    (projects || []).forEach(project => {
        project.environments.forEach(env => 
            env.furniture.forEach(fur => {
                const assemblyStage = fur.assembly;
                if (
                    assemblyStage.status === 'done' && 
                    assemblyStage.completedAt
                ) {
                    const completedDate = parseISO(assemblyStage.completedAt);
                    const completedMonth = getMonth(completedDate);
                    const completedYear = getYear(completedDate);

                    const monthData = months.find(m => m.month === completedMonth && m.year === completedYear);
                    if (monthData) {
                        monthData.Móveis_Finalizados++;
                    }
                }
            })
        );
    });

    return months;
  }, [projects]);
  
  return (
    <div className="h-full flex flex-col justify-center items-center">
        <h2 className="text-4xl font-bold text-center mb-8">Produção Mensal da Fábrica</h2>
        <Card className="bg-gray-800/80 border-primary/50 w-full max-w-6xl h-[60vh]">
            <CardHeader>
                <CardTitle className="text-primary">Móveis Finalizados (Últimos 12 Meses)</CardTitle>
            </CardHeader>
            <CardContent className="h-[85%]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyProductionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                        dataKey="name" 
                        stroke="rgba(255, 255, 255, 0.7)"
                        fontSize={12}
                    />
                    <YAxis 
                        stroke="rgba(255, 255, 255, 0.7)"
                        allowDecimals={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                        contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="Móveis_Finalizados" fill="hsl(var(--primary))" name="Móveis Finalizados" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>
  );
}
