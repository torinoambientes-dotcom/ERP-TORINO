'use client';
import { useContext, useMemo } from 'react';
import Link from 'next/link';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarTask } from './calendar/page';
import type { TeamMember } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { getProjectStatus } from '@/lib/projects';

export default function DashboardPage() {
  const { user } = useUser();
  const { projects, teamMembers, appointments, isLoading } = useContext(AppContext);

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const memberMap = useMemo(() => {
    const map = new Map<string, TeamMember>();
    teamMembers.forEach(member => map.set(member.id, member));
    return map;
  }, [teamMembers]);

  const todaysTasks = useMemo(() => {
    if (isLoading || !loggedInMember) return [];
    
    const tasks: CalendarTask[] = [];
    const today = new Date();

    // Project stages scheduled for today
    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          (['measurement', 'cutting', 'purchase', 'assembly'] as const).forEach(stageKey => {
            const stage = fur[stageKey];
            if (stage && stage.scheduledFor && stage.responsibleId === loggedInMember.id && isToday(parseISO(stage.scheduledFor))) {
              tasks.push({
                id: `${fur.id}-${stageKey}`,
                type: 'project',
                title: `${fur.name} (${project.clientName})`,
                subtitle: `Etapa: ${stageKey}`,
                link: `/projects/${project.id}`,
                responsible: [loggedInMember],
                date: parseISO(stage.scheduledFor),
                start: parseISO(stage.scheduledFor),
                end: parseISO(stage.scheduledFor),
                rawData: { projectId: project.id, envId: env.id, furId: fur.id, stageKey },
              });
            }
          });
        });
      });
    });

    // Appointments for today
    appointments.forEach(appointment => {
      if (appointment.start && appointment.memberIds.includes(loggedInMember.id) && isToday(parseISO(appointment.start))) {
        tasks.push({
          id: appointment.id,
          type: 'appointment',
          title: appointment.title,
          subtitle: appointment.description,
          responsible: [loggedInMember],
          date: parseISO(appointment.start),
          start: parseISO(appointment.start),
          end: parseISO(appointment.end),
          rawData: { appointmentId: appointment.id },
        });
      }
    });

    return tasks.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [projects, appointments, isLoading, loggedInMember]);

  const activeProjects = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter(project => !project.completedAt)
      .map(project => ({ project, statusInfo: getProjectStatus(project) }))
      .slice(0, 5); // Limit to 5 for the dashboard
  }, [projects]);


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
                    <CardTitle>Projetos Ativos</CardTitle>
                    <CardDescription>Uma visão rápida dos projetos em andamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {activeProjects.length > 0 ? activeProjects.map(({ project }) => (
                            <Link href={`/projects/${project.id}`} key={project.id}>
                                <div className="p-4 rounded-lg border bg-card/80 hover:bg-muted transition-colors flex justify-between items-center">
                                    <p className="font-semibold">{project.clientName}</p>
                                    <Button variant="ghost" size="sm">
                                        Ver Projeto <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </Link>
                        )) : (
                           <p className="text-sm text-muted-foreground text-center py-4">Nenhum projeto ativo.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Compromissos de Hoje</CardTitle>
              <CardDescription>{format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}</CardDescription>
            </CardHeader>
            <CardContent>
              {todaysTasks.length > 0 ? (
                <ul className="space-y-3">
                  {todaysTasks.map(task => (
                    <li key={task.id} className="flex items-start gap-3 rounded-lg p-3 bg-muted/50 border">
                       <div className="w-1.5 h-auto self-stretch rounded-full" style={{backgroundColor: task.responsible[0]?.color || '#ccc'}}></div>
                       <div className="flex-grow overflow-hidden">
                          <p className="font-semibold truncate">{task.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{task.subtitle}</p>
                       </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum compromisso para hoje.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
