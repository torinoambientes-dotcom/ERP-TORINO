'use client';
import { useContext, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AppContext } from '@/context/app-context';
import type { Furniture, Project, Pendency, Comment, TeamMember } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { generateId } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '../ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface FurnitureChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: Furniture;
  environmentId: string;
  project: Project;
  setProject: (project: Project) => void;
}

export function FurnitureChatModal({
  isOpen,
  onClose,
  furniture,
  environmentId,
  project,
  setProject,
}: FurnitureChatModalProps) {
  const { teamMembers } = useContext(AppContext);
  const [newComment, setNewComment] = useState('');
  const [newPendency, setNewPendency] = useState('');
  
  // Use the first member as default, but allow changing
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(
    teamMembers.length > 0 ? teamMembers[0].id : undefined
  );


  const memberMap = useMemo(() => {
    return new Map(teamMembers.map((m) => [m.id, m]));
  }, [teamMembers]);

  const selectedMember = selectedMemberId ? memberMap.get(selectedMemberId) : null;

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedMemberId) return;

    const comment: Comment = {
      id: generateId('comm'),
      memberId: selectedMemberId,
      text: newComment,
      timestamp: new Date().toISOString(),
    };

    const newProject = { ...project };
    const env = newProject.environments.find((e) => e.id === environmentId);
    if (env) {
      const fur = env.furniture.find((f) => f.id === furniture.id);
      if (fur) {
        if (!fur.comments) fur.comments = [];
        fur.comments.push(comment);
        setProject(newProject);
        setNewComment('');
      }
    }
  };

  const handleAddPendency = () => {
    if (!newPendency.trim() || !selectedMemberId) return;

    const pendency: Pendency = {
      id: generateId('pend'),
      text: newPendency,
      isResolved: false,
      authorId: selectedMemberId,
    };

    const newProject = { ...project };
    const env = newProject.environments.find((e) => e.id === environmentId);
    if (env) {
      const fur = env.furniture.find((f) => f.id === furniture.id);
      if (fur) {
        if (!fur.pendencies) fur.pendencies = [];
        fur.pendencies.push(pendency);
        setProject(newProject);
        setNewPendency('');
      }
    }
  };

  const handleTogglePendency = (pendencyId: string) => {
    const newProject = { ...project };
    const env = newProject.environments.find((e) => e.id === environmentId);
    if (env) {
      const fur = env.furniture.find((f) => f.id === furniture.id);
      if (fur && fur.pendencies) {
        const pendency = fur.pendencies.find((p) => p.id === pendencyId);
        if (pendency) {
          pendency.isResolved = !pendency.isResolved;
          setProject(newProject);
        }
      }
    }
  };

  const UserSelector = () => (
    <div className='mb-2'>
        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
          <SelectTrigger className="w-full sm:w-[220px]">
             {selectedMember ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedMember.color }}></span>
                    <span>{selectedMember.name}</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Selecione o usuário" />
                )}
          </SelectTrigger>
          <SelectContent>
            {teamMembers.length > 0 ? (
                teamMembers.map((member: TeamMember) => (
                    <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: member.color }}></span>
                            <span>{member.name}</span>
                        </div>
                    </SelectItem>
                ))
            ) : (
                <div className='p-2 text-sm text-muted-foreground'>Cadastre uma equipe.</div>
            )}
          </SelectContent>
        </Select>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{furniture.name}</DialogTitle>
          <DialogDescription>
            Use este espaço para conversas e para registrar pendências.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pendencies" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pendencies">Pendências</TabsTrigger>
            <TabsTrigger value="chat">Conversa</TabsTrigger>
          </TabsList>
          
          {/* Pendencies Tab */}
          <TabsContent value="pendencies" className="flex-grow flex flex-col mt-4 overflow-hidden">
            <div className="flex-grow overflow-y-auto">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-3">
                  {furniture.pendencies && furniture.pendencies.length > 0 ? (
                    furniture.pendencies.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={p.id}
                          checked={p.isResolved}
                          onCheckedChange={() => handleTogglePendency(p.id)}
                        />
                        <label
                          htmlFor={p.id}
                          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                            p.isResolved
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {p.text}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma pendência para este item.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
             <Separator className="my-4" />
             <UserSelector />
            <div className="flex gap-2 mt-auto">
              <Input
                value={newPendency}
                onChange={(e) => setNewPendency(e.target.value)}
                placeholder="Nova pendência..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddPendency()}
                disabled={!selectedMember}
              />
              <Button onClick={handleAddPendency} disabled={!selectedMember}>
                Adicionar
              </Button>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-grow flex flex-col mt-4 overflow-hidden">
            <div className="flex-grow overflow-y-auto">
               <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {furniture.comments && furniture.comments.length > 0 ? (
                    furniture.comments.map((c) => {
                      const member = memberMap.get(c.memberId);
                      return (
                        <div key={c.id} className="flex gap-3 text-sm">
                          {member && (
                            <span
                              className="h-8 w-8 rounded-full flex-shrink-0"
                              style={{ backgroundColor: member.color }}
                            ></span>
                          )}
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                {member?.name || 'Desconhecido'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(c.timestamp), { addSuffix: true, locale: ptBR })}
                                </span>
                            </div>
                            <p className="text-muted-foreground">{c.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum comentário ainda. Inicie a conversa!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
             <Separator className="my-4" />
             <UserSelector />
            <div className="flex gap-2 mt-auto">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                disabled={!selectedMember}
              />
              <Button onClick={handleAddComment} disabled={!selectedMember}>
                Enviar
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
