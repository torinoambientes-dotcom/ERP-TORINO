'use client';
import { useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { AppContext } from '@/context/app-context';
import type { Pendency, Project, StageStatus, TeamMember, StockMovement } from '@/lib/types';
import { ChevronsUpDown, ExternalLink } from 'lucide-react';
import { isThisWeek, isThisMonth, isThisYear, parseISO, format, subMonths, getYear, getMonth, intervalToDuration, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { getProjectStatus, ProjectStatusInfo } from '@/lib/projects';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface GeneralPendency extends Pendency {
  projectName: string;
  environmentName: string;
  furnitureName: string;
  isAssignedToMember: boolean;
}

interface ExecutionTimeRecord {
  id: string;
  projectName: string;
  furnitureName: string;
  memberId: string;
  memberName: string;
  memberColor: string;
  startedAt: string;
  completedAt: string;
  duration: string;
}

const statusColors = {
  done: '#16a34a', // green
  in_progress: '#2563eb', // blue
  todo: '#f97316', // orange
};

type TimePeriod = 'this_month' | 'last_30_days' | 'last_month';

interface ConsumptionRecord {
    itemId: string;
    itemName: string;
    unit: string;
    quantity: number;
}

export default function ReportsPage() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('ReportsPage must be used within an AppProvider');
  }
  const { projects, teamMembers, stockMovements, stockItems } = context;

  const [isPendenciesOpen, setIsPendenciesOpen] = useState(true);
  const [isProductivityOpen, setIsProductivityOpen] = useState(true);
  const [isProjectsStatusOpen, setIsProjectsStatusOpen] = useState(true);
  const [isExecutionTimeOpen, setIsExecutionTimeOpen] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState('all');

  const [consumptionPeriod, setConsumptionPeriod] = useState<TimePeriod>('this_month');
  const [consumptionMemberId, setConsumptionMemberId] = useState('all');

  const { marceneiros, memberMap } = useMemo(() => {
    const marceneiros: TeamMember[] = [];
    const outrosMembros: TeamMember[] = [];
    const memberMap = new Map<string, TeamMember>();
    (teamMembers || []).forEach(member => {
      memberMap.set(member.id, member);
      if (member.role === 'Marceneiro') {
        marceneiros.push(member);
      } else {
        outrosMembros.push(member);
      }
    });
    return { marceneiros, outrosMembros, memberMap };
  }, [teamMembers]);


  const projectStats = useMemo(() => {
    let completedProjects = 0;
    let ongoingProjects = 0;

    projects.forEach((project) => {
      let totalTasks = 0;
      let doneTasks = 0;
      let hasStarted = false;

      project.environments.forEach((env) => {
        env.furniture.forEach((fur) => {
          const stages = ['measurement', 'cutting', 'purchase', 'assembly'] as const;
          stages.forEach((key) => {
            totalTasks++;
            const stage = fur[key];
            if (stage.status === 'done') doneTasks++;
            if (stage.status !== 'todo') hasStarted = true;
          });
        });
      });

      if (totalTasks > 0 && totalTasks === doneTasks) {
        completedProjects++;
      } else if (hasStarted) {
        ongoingProjects++;
      }
    });

    return {
      totalProjects: projects.length,
      completedProjects,
      ongoingProjects,
      pendingProjects: projects.length - completedProjects - ongoingProjects,
    };
  }, [projects]);
  
  const completedStats = useMemo(() => {
    const completedThisWeek = projects.filter(p => p.completedAt && isThisWeek(parseISO(p.completedAt), { weekStartsOn: 1 })).length;
    const completedThisMonth = projects.filter(p => p.completedAt && isThisMonth(parseISO(p.completedAt))).length;
    const completedThisYear = projects.filter(p => p.completedAt && isThisYear(parseISO(p.completedAt))).length;
    
    return {
      week: completedThisWeek,
      month: completedThisMonth,
      year: completedThisYear
    }
  }, [projects]);


  const productivityData = useMemo(() => {
    const membersToDisplay = selectedMemberId === 'all'
      ? teamMembers
      : teamMembers.filter(m => m.id === selectedMemberId);

    return membersToDisplay.map(member => {
      const tasks = {
        todo: 0,
        in_progress: 0,
        done: 0,
      };

      projects.forEach(p => {
        p.environments.forEach(e => {
          e.furniture.forEach(f => {
            const stages = ['measurement', 'cutting', 'purchase', 'assembly'] as const;
            stages.forEach(key => {
              const stage = f[key];
              if (stage.responsibleIds?.includes(member.id)) {
                tasks[stage.status]++;
              }
            });
          });
        });
      });
      
      return {
        name: member.name.split(' ')[0], // Use first name for brevity
        A_Fazer: tasks.todo,
        Em_Andamento: tasks.in_progress,
        Concluido: tasks.done,
      };
    });
  }, [projects, teamMembers, selectedMemberId]);

  const monthlyCarpenterData = useMemo(() => {
    const months = Array.from({ length: 12 }).map((_, i) => {
        const date = subMonths(new Date(), i);
        return {
            name: format(date, 'MMM/yy', { locale: ptBR }),
            month: getMonth(date),
            year: getYear(date),
            Móveis_Finalizados: 0,
        };
    }).reverse();

    const memberIdsToFilter = selectedMemberId === 'all' 
      ? marceneiros.map(m => m.id)
      : [selectedMemberId];

    projects.forEach(project => {
        project.environments.forEach(env => 
            env.furniture.forEach(fur => {
                const assemblyStage = fur.assembly;
                if (
                    assemblyStage.status === 'done' && 
                    assemblyStage.completedAt && 
                    assemblyStage.responsibleIds &&
                    assemblyStage.responsibleIds.some(id => memberIdsToFilter.includes(id))
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
  }, [projects, marceneiros, selectedMemberId]);


  const unresolvedPendencies = useMemo((): GeneralPendency[] => {
    const pendencies: GeneralPendency[] = [];
    projects.forEach(project => {
      project.environments.forEach(environment => {
        environment.furniture.forEach(furniture => {
          let isAssignedToMember = false;
          if (selectedMemberId !== 'all') {
            const stages = ['measurement', 'cutting', 'purchase', 'assembly'] as const;
            isAssignedToMember = stages.some(key => furniture[key]?.responsibleIds?.includes(selectedMemberId));
          }

          if (furniture.pendencies) {
            furniture.pendencies.forEach(pendency => {
              if (!pendency.isResolved) {
                pendencies.push({
                  ...pendency,
                  projectName: project.clientName,
                  environmentName: environment.name,
                  furnitureName: furniture.name,
                  isAssignedToMember: isAssignedToMember,
                });
              }
            });
          }
        });
      });
    });

    if (selectedMemberId !== 'all') {
      return pendencies.filter(p => p.isAssignedToMember);
    }
    
    return pendencies;
  }, [projects, selectedMemberId]);

  const projectsByStatus = useMemo(() => {
    const statuses: { [key: string]: { project: Project, statusInfo: ProjectStatusInfo }[] } = {
      'Em Andamento': [],
      'Novo': [],
      'Concluído': []
    };
    
    projects.forEach(project => {
      const statusInfo = getProjectStatus(project);
      if (statuses[statusInfo.status]) {
        statuses[statusInfo.status].push({ project, statusInfo });
      }
    });

    return statuses;

  }, [projects]);

  const executionTimeData = useMemo((): ExecutionTimeRecord[] => {
    const records: ExecutionTimeRecord[] = [];
    const memberIdsToFilter = selectedMemberId === 'all' 
      ? marceneiros.map(m => m.id)
      : [selectedMemberId];
    
    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          const stage = fur.assembly;
          if (
            stage.status === 'done' &&
            stage.startedAt &&
            stage.completedAt &&
            stage.responsibleIds &&
            stage.responsibleIds.some(id => memberIdsToFilter.includes(id))
          ) {
            const firstResponsibleId = stage.responsibleIds[0];
            const member = memberMap.get(firstResponsibleId);
            if(member) {
              const duration = intervalToDuration({
                start: parseISO(stage.startedAt),
                end: parseISO(stage.completedAt),
              });
              
              const durationString = [
                duration.days ? `${duration.days}d` : null,
                duration.hours ? `${duration.hours}h` : null,
                duration.minutes ? `${duration.minutes}m` : null,
              ].filter(Boolean).join(' ') || '0m';

              records.push({
                id: fur.id,
                projectName: project.clientName,
                furnitureName: fur.name,
                memberId: member.id, // Storing one member for simplicity, could be adapted
                memberName: member.name,
                memberColor: member.color,
                startedAt: stage.startedAt,
                completedAt: stage.completedAt,
                duration: durationString,
              });
            }
          }
        });
      });
    });
    return records.sort((a,b) => parseISO(b.completedAt).getTime() - parseISO(a.completedAt).getTime());
  }, [projects, selectedMemberId, marceneiros, memberMap]);

  const consumptionData = useMemo((): ConsumptionRecord[] => {
        const now = new Date();
        let startDate: Date;

        switch (consumptionPeriod) {
            case 'last_30_days':
                startDate = subDays(now, 30);
                break;
            case 'last_month':
                const lastMonth = subMonths(now, 1);
                startDate = startOfMonth(lastMonth);
                break;
            case 'this_month':
            default:
                startDate = startOfMonth(now);
                break;
        }

        const filteredMovements = stockMovements.filter(mov => {
            const movDate = parseISO(mov.timestamp);
            const isWithinPeriod = movDate >= startDate;
            const isExitByCarpenter = mov.reason === 'uso_marceneiro';
            const matchesMember = consumptionMemberId === 'all' || mov.details === consumptionMemberId;
            return isWithinPeriod && isExitByCarpenter && matchesMember;
        });

        const consumptionMap = new Map<string, { itemName: string; unit: string; quantity: number }>();

        filteredMovements.forEach(mov => {
            const item = stockItems.find(si => si.id === mov.stockItemId);
            if (!item) return;

            const existing = consumptionMap.get(item.id);
            if (existing) {
                existing.quantity += mov.quantity;
            } else {
                consumptionMap.set(item.id, {
                    itemName: item.name,
                    unit: item.unit,
                    quantity: mov.quantity,
                });
            }
        });

        return Array.from(consumptionMap.entries()).map(([itemId, data]) => ({
            itemId,
            ...data,
        })).sort((a, b) => a.itemName.localeCompare(b.itemName));

  }, [stockMovements, stockItems, consumptionPeriod, consumptionMemberId]);
  
  const ProjectStatusList = ({ title, projectsWithStatus }: { title: string, projectsWithStatus: { project: Project, statusInfo: ProjectStatusInfo }[] }) => {
    if (projectsWithStatus.length === 0) return null;

    return (
      <div>
        <h4 className="font-semibold text-lg mb-2">{title} ({projectsWithStatus.length})</h4>
        <div className="space-y-3">
          {projectsWithStatus.map(({ project, statusInfo }) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block">
              <div className="p-3 rounded-md border bg-muted/50 hover:bg-muted/80 transition-colors">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{project.clientName}</p>
                  <Button variant="ghost" size="sm" className="h-7">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Ver
                  </Button>
                </div>
                <div className="space-y-1 mt-1">
                  <Progress value={statusInfo.progress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {statusInfo.doneTasks} de {statusInfo.totalTasks} tarefas concluídas
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
        <PageHeader
          title="Relatórios"
          description="Acompanhe a produtividade e o andamento dos projetos."
        />

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="projects">Projetos</TabsTrigger>
              <TabsTrigger value="production">Produção</TabsTrigger>
              <TabsTrigger value="stock">Estoque</TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectStats.totalProjects}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectStats.ongoingProjects}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectStats.completedProjects}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projetos Pendentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{projectStats.pendingProjects}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Projetos Concluídos ao Longo do Tempo</CardTitle>
                    <CardDescription>Resumo de projetos finalizados na semana, mês e ano.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
                            <p className="text-3xl font-bold">{completedStats.week}</p>
                            <p className="text-sm text-muted-foreground">nesta semana</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
                            <p className="text-3xl font-bold">{completedStats.month}</p>
                            <p className="text-sm text-muted-foreground">neste mês</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
                            <p className="text-3xl font-bold">{completedStats.year}</p>
                            <p className="text-sm text-muted-foreground">neste ano</p>
                        </div>
                    </div>
                </CardContent>
              </Card>

              <Collapsible
                open={isProjectsStatusOpen}
                onOpenChange={setIsProjectsStatusOpen}
                className="w-full"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className='space-y-1.5'>
                        <CardTitle className="font-headline">Status dos Projetos</CardTitle>
                        <CardDescription>Lista de todos os projetos por status.</CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <ChevronsUpDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-6">
                        <ProjectStatusList title="Em Andamento" projectsWithStatus={projectsByStatus['Em Andamento']} />
                        <Separator />
                        <ProjectStatusList title="Novos" projectsWithStatus={projectsByStatus['Novo']} />
                        <Separator />
                        <ProjectStatusList title="Concluídos" projectsWithStatus={projectsByStatus['Concluído']} />

                        {Object.values(projectsByStatus).every(arr => arr.length === 0) && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum projeto encontrado.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
          </TabsContent>

          <TabsContent value="production" className="mt-6 space-y-6">
              <div className="flex justify-end">
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Filtrar por membro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                        <div className="flex items-center gap-2">
                            Todos os Membros
                        </div>
                    </SelectItem>
                    <Separator/>
                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Marceneiros</p>
                    {marceneiros.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                            <AvatarFallback style={{ backgroundColor: member.color }} className='text-xs'>
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <Separator/>
                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Outros Membros</p>
                    {(teamMembers.filter(m => m.role !== 'Marceneiro')).map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                            <AvatarFallback style={{ backgroundColor: member.color }} className='text-xs'>
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

               <Card>
                  <CardHeader>
                      <CardTitle className="font-headline">Móveis Finalizados por Marceneiro (Mensal)</CardTitle>
                      <CardDescription>Número de móveis onde a "Pré Montagem" foi concluída pelo marceneiro selecionado.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={monthlyCarpenterData}
                          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false}/>
                          <Tooltip 
                              contentStyle={{
                                background: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: 'var(--radius)',
                              }}
                          />
                          <Bar dataKey="Móveis_Finalizados" fill={statusColors.done} name="Móveis Finalizados"/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              
              <Collapsible
                open={isProductivityOpen}
                onOpenChange={setIsProductivityOpen}
                className="w-full"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className='space-y-1.5'>
                            <CardTitle className="font-headline">Produtividade da Equipe</CardTitle>
                            <CardDescription>Distribuição de tarefas por membro da equipe.</CardDescription>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart
                            data={productivityData}
                            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false}/>
                            <Tooltip 
                                contentStyle={{
                                  background: 'hsl(var(--background))',
                                  borderColor: 'hsl(var(--border))',
                                  borderRadius: 'var(--radius)',
                                }}
                            />
                            <Legend />
                            <Bar dataKey="A_Fazer" stackId="a" fill={statusColors.todo} name="A Fazer" />
                            <Bar dataKey="Em_Andamento" stackId="a" fill={statusColors.in_progress} name="Em Andamento" />
                            <Bar dataKey="Concluido" stackId="a" fill={statusColors.done} name="Concluído" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible
                open={isExecutionTimeOpen}
                onOpenChange={setIsExecutionTimeOpen}
                className="w-full"
              >
                <Card>
                   <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className='space-y-1.5'>
                            <CardTitle className="font-headline">Análise de Tempo de Execução (Pré Montagem)</CardTitle>
                            <CardDescription>Tempo gasto por cada marceneiro para concluir a etapa de pré montagem.</CardDescription>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Marceneiro</TableHead>
                              <TableHead>Projeto</TableHead>
                              <TableHead>Móvel</TableHead>
                              <TableHead>Início</TableHead>
                              <TableHead>Fim</TableHead>
                              <TableHead className="text-right">Duração</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {executionTimeData.length > 0 ? executionTimeData.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback style={{ backgroundColor: record.memberColor }} className='text-xs'>
                                            {getInitials(record.memberName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{record.memberName}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{record.projectName}</TableCell>
                                <TableCell>{record.furnitureName}</TableCell>
                                <TableCell>{format(parseISO(record.startedAt), 'dd/MM/yy HH:mm')}</TableCell>
                                <TableCell>{format(parseISO(record.completedAt), 'dd/MM/yy HH:mm')}</TableCell>
                                <TableCell className="text-right font-medium">{record.duration}</TableCell>
                              </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhum móvel com pré-montagem concluída para o filtro selecionado.
                                    </TableCell>
                                </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>


              <Collapsible
                open={isPendenciesOpen}
                onOpenChange={setIsPendenciesOpen}
                className="w-full"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className='space-y-1.5'>
                        <CardTitle className="font-headline">Pendências Gerais ({unresolvedPendencies.length})</CardTitle>
                        <CardDescription>Lista de todas as pendências não resolvidas associadas ao membro selecionado.</CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <ChevronsUpDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {unresolvedPendencies.length > 0 ? unresolvedPendencies.map((pendency) => (
                          <div key={pendency.id} className="p-3 rounded-md bg-muted/50 border-l-4 border-destructive">
                            <p className="font-semibold">{pendency.text}</p>
                            <p className="text-sm text-muted-foreground">
                              {pendency.projectName} / {pendency.environmentName} / {pendency.furnitureName}
                            </p>
                          </div>
                        )) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {selectedMemberId === 'all'
                              ? "Nenhuma pendência em aberto."
                              : "Nenhuma pendência para o membro selecionado."
                            }
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
          </TabsContent>

          <TabsContent value="stock" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Relatório de Consumo por Marceneiro</CardTitle>
                    <CardDescription>Analise o consumo de materiais por marceneiro em um período específico.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select value={consumptionPeriod} onValueChange={(v) => setConsumptionPeriod(v as TimePeriod)}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filtrar por período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this_month">Este Mês</SelectItem>
                                <SelectItem value="last_30_days">Últimos 30 Dias</SelectItem>
                                <SelectItem value="last_month">Mês Passado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={consumptionMemberId} onValueChange={setConsumptionMemberId}>
                            <SelectTrigger className="w-full sm:w-[280px]">
                                <SelectValue placeholder="Filtrar por marceneiro" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Marceneiros</SelectItem>
                                {marceneiros.map(member => (
                                    <SelectItem key={member.id} value={member.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                                                <AvatarFallback style={{ backgroundColor: member.color }} className='text-xs'>
                                                    {getInitials(member.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{member.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item do Estoque</TableHead>
                                    <TableHead className="text-right">Quantidade Consumida</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {consumptionData.length > 0 ? (
                                    consumptionData.map(record => (
                                        <TableRow key={record.itemId}>
                                            <TableCell className="font-medium">{record.itemName}</TableCell>
                                            <TableCell className="text-right">{record.quantity} {record.unit}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            Nenhum consumo registrado para os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
