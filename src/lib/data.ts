import type { Project, TeamMember } from './types';

export const initialTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Alice',
    color: '#3b82f6',
  },
  {
    id: '2',
    name: 'Bruno',
    color: '#16a34a',
  },
  {
    id: '3',
    name: 'Carla',
    color: '#f97316',
  },
  {
    id: '4',
    name: 'Daniel',
    color: '#8b5cf6',
  },
];

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    clientName: 'Silva & Filhos Ltda.',
    environments: [
      {
        id: 'env-1',
        name: 'Cozinha Planejada',
        furniture: [
          {
            id: 'fur-1-1',
            name: 'Armário Superior',
            measurement: { status: 'done', responsibleId: '1' },
            cutting: { status: 'in_progress', responsibleId: '2' },
            purchase: { status: 'in_progress', responsibleId: '3' },
            assembly: { status: 'todo' },
          },
          {
            id: 'fur-1-2',
            name: 'Bancada de Granito',
            measurement: { status: 'done', responsibleId: '1' },
            cutting: { status: 'todo' },
            purchase: { status: 'done', responsibleId: '3' },
            assembly: { status: 'todo' },
          },
        ],
      },
      {
        id: 'env-2',
        name: 'Quarto Casal',
        furniture: [
          {
            id: 'fur-2-1',
            name: 'Guarda-roupa embutido',
            measurement: { status: 'done', responsibleId: '1' },
            cutting: { status: 'done', responsibleId: '2' },
            purchase: { status: 'done', responsibleId: '3' },
            assembly: { status: 'in_progress', responsibleId: '4' },
          },
        ],
      },
    ],
  },
  {
    id: 'proj-2',
    clientName: 'Mariana Costa',
    environments: [
      {
        id: 'env-3',
        name: 'Escritório',
        furniture: [
          {
            id: 'fur-3-1',
            name: 'Mesa de trabalho',
            measurement: { status: 'in_progress', responsibleId: '1' },
            cutting: { status: 'todo' },
            purchase: { status: 'todo' },
            assembly: { status: 'todo' },
          },
          {
            id: 'fur-3-2',
            name: 'Estante de livros',
            measurement: { status: 'in_progress', responsibleId: '1' },
            cutting: { status: 'todo' },
            purchase: { status: 'todo' },
            assembly: { status: 'todo' },
          },
        ],
      },
    ],
  },
  {
    id: 'proj-3',
    clientName: 'Construtora Horizonte',
    environments: [
      {
        id: 'env-4',
        name: 'Recepção',
        furniture: [
          {
            id: 'fur-4-1',
            name: 'Balcão de Atendimento',
            measurement: { status: 'done', responsibleId: '1' },
            cutting: { status: 'done', responsibleId: '2' },
            purchase: { status: 'done', responsibleId: '3' },
            assembly: { status: 'done', responsibleId: '4' },
          },
        ],
      },
    ],
  },
];
