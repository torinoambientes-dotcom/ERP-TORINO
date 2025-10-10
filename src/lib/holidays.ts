import { parse } from 'date-fns';

export interface Holiday {
  date: Date;
  name: string;
}

// TODO: Replace this with a dynamic API call to a Brazilian holidays service
const holidaysData: { date: string; name: string }[] = [
  { date: '2024-01-01', name: 'Confraternização Universal' },
  { date: '2024-02-12', name: 'Carnaval' },
  { date: '2024-02-13', name: 'Carnaval' },
  { date: '2024-03-29', name: 'Sexta-feira Santa' },
  { date: '2024-04-21', name: 'Tiradentes' },
  { date: '2024-05-01', name: 'Dia do Trabalho' },
  { date: '2024-05-30', name: 'Corpus Christi' },
  { date: '2024-09-07', name: 'Independência do Brasil' },
  { date: '2024-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2024-11-02', name: 'Finados' },
  { date: '2024-11-15', name: 'Proclamação da República' },
  { date: '2024-11-20', name: 'Dia da Consciência Negra' },
  { date: '2024-12-25', name: 'Natal' },
];

export const getHolidaysForYear = (year: number): Holiday[] => {
    // This function simply replaces the year in the hardcoded data.
    // A real implementation would fetch data for the given year.
    return holidaysData.map(h => ({
        date: parse(`${year}-${h.date.substring(5)}`, 'yyyy-MM-dd', new Date()),
        name: h.name
    }));
};
