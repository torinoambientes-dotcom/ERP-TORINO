'use client';
import { useContext, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarTask } from './calendar/page';
import type { TeamMember, StockItem, Priority, Task, StageStatus, ProductionStage } from '@/lib/types';
import { STAGE_STATUSES } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShoppingCart, RectangleHorizontal, DoorOpen, AlertTriangle, Cake, StickyNote, Flag } from 'lucide-react';
import { getProjectStatus } from '@/lib/projects';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface LowStockInfo extends StockItem {
  demand?: number;
}

const priorityMap: Record<Priority, { label: string; className: string }> = {
    low: { label: 'Baixa', className: 'text-gray-500' },
    medium: { label: 'Média', className: 'text-yellow-500' },
    high: { label: 'Alta', className: 'text-red-500' },
};


export default function DashboardPage() {
  const { user } = useUser();
  const { projects, teamMembers, appointments, tasks: allTasks, purchaseRequests, stockItems, isLoading, updateProject, updateTaskStatus } = useContext(AppContext);
  const { toast } = useToast();

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const memberMap = useMemo(() => {
    const map = new Map<string, TeamMember>();
    teamMembers.forEach(member => map.set(member.id, member));
    return map;
  }, [teamMembers]);

  const allMemberTasks = useMemo(() => {
    if (isLoading || !loggedInMember) return [];
    
    const tasks: CalendarTask[] = [];

    // Project stages
    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          (['measurement', 'cutting', 'purchase', 'assembly'] as const).forEach(stageKey => {
            const stage = fur[stageKey];
            if (stage && stage.scheduledFor && stage.responsibleIds?.includes(loggedInMember.id)) {
              tasks.push({
                id: `${fur.id}-${stageKey}`, type: 'project', title: `${fur.name} (${project.clientName})`,
                subtitle: `Etapa: ${STAGE_STATUSES[stageKey]}`, link: `/projects/${project.id}`, responsible: [loggedInMember],
                date: parseISO(stage.scheduledFor), start: parseISO(stage.scheduledFor), end: parseISO(stage.scheduledFor),
                priority: stage.priority,
                rawData: { projectId: project.id, envId: env.id, furId: fur.id, stageKey },
              });
            }
          });
        });
      });
    });

    // Appointments
    appointments.forEach(appointment => {
      if (appointment.start && appointment.memberIds?.includes(loggedInMember.id)) {
        tasks.push({
          id: appointment.id, type: 'appointment', title: appointment.title, subtitle: appointment.description,
          responsible: [loggedInMember], date: parseISO(appointment.start), start: parseISO(appointment.start),
          end: parseISO(appointment.end), rawData: { appointmentId: appointment.id }, priority: 'medium',
        });
      }
    });

    // Generic Tasks
    (allTasks || []).forEach(task => {
        if(task.dueDate && task.assigneeIds?.includes(loggedInMember.id)) {
            tasks.push({
                id: task.id, type: 'task', title: task.title, subtitle: task.description,
                responsible: [loggedInMember], date: parseISO(task.dueDate), start: parseISO(task.dueDate),
                end: parseISO(task.dueDate), rawData: { taskId: task.id }, priority: task.priority
            })
        }
    })
    
    const priorityOrder: Record<Priority, number> = { high: 1, medium: 2, low: 3 };

    return tasks.sort((a, b) => {
        const priorityA = a.priority || 'medium';
        const priorityB = b.priority || 'medium';
        return priorityOrder[priorityA] - priorityOrder[priorityB];
    });

  }, [projects, appointments, allTasks, isLoading, loggedInMember]);
  
  const handleToggleTaskStatus = useCallback((task: CalendarTask, isChecked: boolean) => {
    const newStatus: StageStatus = isChecked ? 'done' : 'in_progress';
    
    if (task.type === 'project' && task.rawData.projectId) {
        const project = projects.find(p => p.id === task.rawData.projectId);
        if (!project) return;

        const newProject = JSON.parse(JSON.stringify(project));
        const env = newProject.environments.find((e: any) => e.id === task.rawData.envId);
        if (!env) return;
        const fur = env.furniture.find((f: any) => f.id === task.rawData.furId);
        if (!fur || !task.rawData.stageKey) return;
        
        const stageToUpdate = fur[task.rawData.stageKey] as ProductionStage;
        if (!stageToUpdate) return;
        
        const previousStatus = stageToUpdate.status;
        stageToUpdate.status = newStatus;

        if (newStatus === 'in_progress' && previousStatus === 'todo') {
            stageToUpdate.startedAt = new Date().toISOString();
        } else if (newStatus === 'done' && !stageToUpdate.completedAt) {
            stageToUpdate.completedAt = new Date().toISOString();
            if (!stageToUpdate.startedAt) {
                stageToUpdate.startedAt = stageToUpdate.completedAt;
            }
        } else if (newStatus !== 'done') {
            delete stageToUpdate.completedAt;
        }

        updateProject(newProject, project);
        
        toast({
          title: `Etapa "${STAGE_STATUSES[task.rawData.stageKey]}" marcada como ${newStatus === 'done' ? 'concluída' : 'em andamento'}.`
        });

    } else if (task.type === 'task' && task.rawData.taskId) {
        updateTaskStatus(task.rawData.taskId, newStatus);
        toast({
          title: `Tarefa "${task.title}" marcada como ${newStatus === 'done' ? 'concluída' : 'em andamento'}.`
        });
    }
  }, [projects, updateProject, updateTaskStatus, toast]);


  const isTaskCompleted = useCallback((task: CalendarTask): boolean => {
    if (task.type === 'project' && task.rawData.projectId) {
      const project = projects.find(p => p.id === task.rawData.projectId);
      if (!project || !task.rawData.stageKey) return false;
      const env = project.environments.find(e => e.id === task.rawData.envId);
      const fur = env?.furniture.find(f => f.id === task.rawData.furId);
      const stage = fur?.[task.rawData.stageKey] as ProductionStage;
      return stage?.status === 'done';
    }
    if (task.type === 'task' && task.rawData.taskId) {
      const genericTask = allTasks.find(t => t.id === task.rawData.taskId);
      return genericTask?.status === 'done';
    }
    return false;
  }, [projects, allTasks]);


  const todaysTasks = useMemo(() => {
    return allMemberTasks.filter(task => isToday(task.date));
  }, [allMemberTasks]);

  const ongoingProjectsForMember = useMemo(() => {
    if (!projects || !loggedInMember) return [];

    return projects
      .map(project => ({ project, statusInfo: getProjectStatus(project) }))
      .filter(({ statusInfo }) => statusInfo.status === 'Em Andamento') // Filtra projetos "Em Andamento"
      .filter(({ project }) => {
        // Verifica se o membro logado é responsável por alguma tarefa no projeto
        return project.environments.some(env =>
          env.furniture.some(fur =>
            (['measurement', 'cutting', 'purchase', 'assembly'] as const).some(stageKey => {
              const stage = fur[stageKey];
              return stage?.responsibleIds?.includes(loggedInMember.id);
            })
          )
        );
      })
      .slice(0, 5); // Limita a 5 para a dashboard
  }, [projects, loggedInMember]);
  
  const pendingPurchaseRequests = useMemo(() => {
    if (!purchaseRequests || !loggedInMember || loggedInMember.role !== 'Administrativo') {
        return [];
    }
    return purchaseRequests
      .filter(req => req.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5); // Limit to 5 for the dashboard
  }, [purchaseRequests, loggedInMember]);

  const highPriorityProjects = useMemo(() => {
    if (!loggedInMember) return [];
    return projects
      .filter(p => !p.completedAt) // Apenas projetos ativos
      .filter(p => {
        // Verifica se o projeto tem alguma tarefa de alta prioridade atribuída AO MEMBRO LOGADO
        return p.environments.some(env =>
          env.furniture.some(fur =>
            (['measurement', 'cutting', 'purchase', 'assembly'] as const).some(stageKey => {
              const stage = fur[stageKey];
              return (
                stage?.priority === 'high' &&
                stage.responsibleIds?.includes(loggedInMember.id)
              );
            })
          )
        );
      })
      .slice(0, 5);
  }, [projects, loggedInMember]);

  const todaysBirthdays = useMemo(() => {
    if (isLoading || !teamMembers) return [];
    const today = new Date();
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayFormatted = `${todayDay}-${todayMonth}`;

    return teamMembers.filter(member => member.birthday === todayFormatted);
  }, [teamMembers, isLoading]);

  const lowStockItems = useMemo((): LowStockInfo[] => {
    if (!stockItems || !loggedInMember || loggedInMember.role !== 'Administrativo') {
      return [];
    }
    return stockItems
      .map(item => {
        const totalReserved = (item.reservations || []).reduce((acc, res) => acc + res.quantity, 0);
        const quantityAwaitingReceipt = item.awaitingReceipt?.quantity || 0;
        const potentialStock = item.quantity + quantityAwaitingReceipt;

        const hasMinStockAlert = typeof item.minStock === 'number' && item.quantity < item.minStock && !item.awaitingReceipt;
        const hasDemandAlert = totalReserved > potentialStock;

        if (hasMinStockAlert || hasDemandAlert) {
            return { ...item, demand: totalReserved };
        }
        return null;
      })
      .filter((item): item is LowStockInfo => item !== null);
  }, [stockItems, loggedInMember]);


  const pendingGlasswareCount = useMemo(() => {
    if (!projects || !loggedInMember || loggedInMember.role !== 'Administrativo') {
      return 0;
    }
    return projects.reduce((acc, project) => {
      if (project.completedAt) return acc;
      return acc + project.environments.reduce((envAcc, env) => {
        return envAcc + env.furniture.reduce((furAcc, fur) => {
          return furAcc + (fur.glassItems || []).filter(g => !g.purchased).length;
        }, 0);
      }, 0);
    }, 0);
  }, [projects, loggedInMember]);
  
  const pendingProfileDoorsCount = useMemo(() => {
      if (!projects || !loggedInMember || loggedInMember.role !== 'Administrativo') {
        return 0;
      }
      return projects.reduce((acc, project) => {
        if (project.completedAt) return acc;
        return acc + project.environments.reduce((envAcc, env) => {
          return envAcc + env.furniture.reduce((furAcc, fur) => {
            return furAcc + (fur.profileDoors || []).filter(d => !d.purchased).length;
          }, 0);
        }, 0);
      }, 0);
  }, [projects, loggedInMember]);


  if (isLoading || !loggedInMember) {
    return <div className="flex h-full w-full items-center justify-center"><p>Carregando dashboard...</p></div>;
  }
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {loggedInMember.avatarUrl && <AvatarImage src={loggedInMember.avatarUrl} alt={loggedInMember.name} />}
          <AvatarFallback style={{ backgroundColor: loggedInMember.color }} className="text-2xl">
            {getInitials(loggedInMember.name)}
          </AvatarFallback>
        </Avatar>
        <div>
            <PageHeader
                title={`${getGreeting()}, ${loggedInMember.name.split(' ')[0]}!`}
                description="Bem-vindo(a) ao seu painel. Aqui estão as suas tarefas para hoje."
            />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Minhas Tarefas do Dia</CardTitle>
                    <CardDescription>{format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}</CardDescription>
                </CardHeader>
                <CardContent>
                {todaysTasks.length > 0 ? (
                    <ul className="space-y-3">
                    {todaysTasks.map(task => {
                        const isCompletable = task.type === 'project' || task.type === 'task';
                        const isCompleted = isCompletable ? isTaskCompleted(task) : false;
                        
                        return (
                          <li key={task.id} className="flex items-start gap-3 rounded-lg p-3 bg-muted/50 border">
                            {isCompletable && (
                              <Checkbox 
                                id={`task-check-${task.id}`}
                                className="mt-1"
                                checked={isCompleted}
                                onCheckedChange={(checked) => handleToggleTaskStatus(task, Boolean(checked))}
                              />
                            )}
                            <div className={cn("w-1.5 h-auto self-stretch rounded-full", !isCompletable && "ml-5")} style={{backgroundColor: task.responsible[0]?.color || '#ccc'}}></div>
                            <div className="flex-grow overflow-hidden">
                                <label htmlFor={`task-check-${task.id}`} className={cn("font-semibold truncate", isCompleted && "line-through text-muted-foreground")}>{task.title}</label>
                                <p className={cn("text-sm text-muted-foreground truncate", isCompleted && "line-through")}>{task.subtitle}</p>
                            </div>
                            {task.priority && <Flag className={cn("h-5 w-5 flex-shrink-0", priorityMap[task.priority].className)} />}
                          </li>
                        );
                    })}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma tarefa agendada para hoje.</p>
                )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Todas as Tarefas</CardTitle>
                    <CardDescription>Uma visão geral de todas as suas tarefas agendadas, ordenadas por prioridade.</CardDescription>
                </CardHeader>
                <CardContent>
                {allMemberTasks.length > 0 ? (
                    <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {allMemberTasks.map(task => {
                        const isCompletable = task.type === 'project' || task.type === 'task';
                        const isCompleted = isCompletable ? isTaskCompleted(task) : false;
                        
                        return (
                            <li key={task.id} className="flex items-start gap-3 rounded-lg p-3 bg-muted/50 border">
                                {isCompletable && (
                                  <Checkbox 
                                    id={`all-task-check-${task.id}`}
                                    className="mt-3"
                                    checked={isCompleted}
                                    onCheckedChange={(checked) => handleToggleTaskStatus(task, Boolean(checked))}
                                  />
                                )}
                                <div className={cn("flex flex-col items-center w-12 text-center text-sm font-semibold", !isCompletable && 'ml-5')}>
                                  <span className="text-xs uppercase text-muted-foreground">{format(task.date, 'MMM', { locale: ptBR })}</span>
                                  <span className="text-lg">{format(task.date, 'dd')}</span>
                                </div>
                                <div className="w-1.5 h-auto self-stretch rounded-full" style={{backgroundColor: task.responsible[0]?.color || '#ccc'}}></div>
                                <div className="flex-grow overflow-hidden">
                                    <label htmlFor={`all-task-check-${task.id}`} className={cn("font-semibold truncate", isCompleted && "line-through text-muted-foreground")}>{task.title}</label>
                                    <p className={cn("text-sm text-muted-foreground truncate", isCompleted && "line-through")}>{task.subtitle}</p>
                                </div>
                                {task.priority && <Flag className={cn("h-5 w-5 flex-shrink-0", priorityMap[task.priority].className)} />}
                            </li>
                        );
                    })}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Você não tem nenhuma tarefa agendada.</p>
                )}
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            {todaysBirthdays.length > 0 && (
              <Card className="border-primary bg-accent/50">
                  <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                          <Cake className="h-6 w-6" /> Aniversariantes do Dia!
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>
                        Desejamos um feliz aniversário para: <span className="font-semibold">{todaysBirthdays.map(m => m.name).join(', ')}</span>! 🎉
                    </p>
                  </CardContent>
              </Card>
            )}

            {loggedInMember.role === 'Administrativo' && lowStockItems.length > 0 && (
              <Card className="border-destructive bg-destructive text-destructive-foreground">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-6 w-6" /> Alerta de Estoque Baixo
                      </CardTitle>
                      <CardDescription className="text-destructive-foreground/90">
                          Existem {lowStockItems.length} item(ns) que precisam de atenção imediata.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {lowStockItems.slice(0, 3).map(item => (
                        <div key={item.id} className="p-2 rounded-lg border border-destructive-foreground/20 bg-background/10 flex justify-between items-center text-sm">
                          <p className="font-semibold">{item.name}</p>
                          <p className='font-bold'>Restam: {item.quantity} {item.unit}</p>
                        </div>
                      ))}
                    </div>
                     <div className='text-center mt-4'>
                        <Button asChild variant="outline" className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90 hover:text-destructive">
                          <Link href="/stock">
                              Ver Estoque Completo <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                  </CardContent>
              </Card>
            )}
            
            {highPriorityProjects.length > 0 && (
              <Card className="border-red-500 bg-red-50/50">
                  <CardHeader>
                      <CardTitle className="text-red-800 flex items-center gap-2">
                          <AlertTriangle className="h-6 w-6" /> Projetos com Prioridade Alta (Para Você)
                      </CardTitle>
                      <CardDescription className="text-red-700">
                          Estes projetos contêm tarefas de alta prioridade atribuídas a você.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {highPriorityProjects.map(project => (
                        <div key={project.id} className="p-3 rounded-lg border bg-card/80 flex justify-between items-center">
                          <div>
                              <p className="font-semibold">{project.clientName}</p>
                          </div>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/projects/${project.id}`}>
                                Ver Projeto <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
              </Card>
            )}

            {loggedInMember.role === 'Administrativo' && pendingPurchaseRequests.length > 0 && (
                <Card className="border-amber-500 bg-amber-50/50">
                    <CardHeader>
                        <CardTitle className="text-amber-800 flex items-center gap-2">
                            <ShoppingCart className="h-6 w-6" /> Solicitações de Compra Pendentes
                        </CardTitle>
                        <CardDescription className="text-amber-700">
                            As solicitações de compra mais recentes que aguardam a sua aprovação.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pendingPurchaseRequests.map(req => (
                          <div key={req.id} className="p-3 rounded-lg border bg-card/80 flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{req.description} ({req.quantity} {req.unit})</p>
                                <p className="text-sm text-muted-foreground">Solicitado por: {req.requesterName}</p>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                              <Link href="/purchases?tab=requests">
                                  Ver <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                          </Button>
                          </div>
                        ))}
                      </div>
                      {purchaseRequests.filter(r => r.status === 'pending').length > 5 && (
                        <div className='text-center mt-4'>
                            <Button asChild variant="outline" className="bg-background">
                              <Link href="/purchases?tab=requests">
                                  Ver Todas as Solicitações <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                           </Button>
                        </div>
                      )}
                    </CardContent>
                </Card>
            )}

            {loggedInMember.role === 'Administrativo' && pendingGlasswareCount > 0 && (
                <Card className="border-sky-500 bg-sky-50/50">
                    <CardHeader>
                        <CardTitle className="text-sky-800 flex items-center gap-2">
                            <RectangleHorizontal className="h-6 w-6" /> Vidraçaria Pendente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                       <p>Existem <span className='font-bold'>{pendingGlasswareCount}</span> item(ns) de vidraçaria aguardando compra nos projetos ativos.</p>
                        <Button asChild variant="outline" className="bg-background">
                            <Link href="/purchases?tab=glass">
                                Ver Lista <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {loggedInMember.role === 'Administrativo' && pendingProfileDoorsCount > 0 && (
                <Card className="border-violet-500 bg-violet-50/50">
                    <CardHeader>
                        <CardTitle className="text-violet-800 flex items-center gap-2">
                            <DoorOpen className="h-6 w-6" /> Portas de Perfil Pendentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                       <p>Existem <span className='font-bold'>{pendingProfileDoorsCount}</span> porta(s) de perfil aguardando compra nos projetos ativos.</p>
                        <Button asChild variant="outline" className="bg-background">
                            <Link href="/purchases?tab=profileDoors">
                                Ver Lista <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Projetos em Andamento (Para Você)</CardTitle>
                    <CardDescription>Uma visão rápida dos projetos que você está trabalhando.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {ongoingProjectsForMember.length > 0 ? ongoingProjectsForMember.map(({ project }) => (
                            <Link href={`/projects/${project.id}`} key={project.id}>
                                <div className="p-4 rounded-lg border bg-card/80 hover:bg-muted transition-colors flex justify-between items-center">
                                    <p className="font-semibold">{project.clientName}</p>
                                    <Button variant="ghost" size="sm">
                                        Ver Projeto <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </Link>
                        )) : (
                           <p className="text-sm text-muted-foreground text-center py-4">Nenhum projeto em andamento atribuído a você.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
