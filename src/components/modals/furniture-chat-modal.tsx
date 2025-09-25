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
import { Separator } from '../ui/separator';

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
  
  const memberMap = useMemo(() => {
    return new Map(teamMembers.map(m => [m.id, m]));
  }, [teamMembers]);

  // For demo, let's assume a "logged in" user. In a real app, this would come from auth.
  const currentMember = useMemo(() => teamMembers.length > 0 ? teamMembers[0] : null, [teamMembers]);

  const handleAddComment = () => {
    if (!newComment.trim() || !currentMember) return;

    const comment: Comment = {
      id: `comm-${Date.now()}`,
      memberId: currentMember.id,
      text: newComment,
      timestamp: new Date().toISOString(),
    };

    const newProject = { ...project };
    const env = newProject.environments.find(e => e.id === environmentId);
    if (env) {
      const fur = env.furniture.find(f => f.id === furniture.id);
      if (fur) {
        if (!fur.comments) fur.comments = [];
        fur.comments.push(comment);
        setProject(newProject);
        setNewComment('');
      }
    }
  };
  
  const handleAddPendency = () => {
    if (!newPendency.trim() || !currentMember) return;

    const pendency: Pendency = {
      id: `pend-${Date.now()}`,
      text: newPendency,
      isResolved: false,
      authorId: currentMember.id
    };

    const newProject = { ...project };
    const env = newProject.environments.find(e => e.id === environmentId);
    if (env) {
      const fur = env.furniture.find(f => f.id === furniture.id);
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
    const env = newProject.environments.find(e => e.id === environmentId);
    if (env) {
      const fur = env.furniture.find(f => f.id === furniture.id);
      if (fur && fur.pendencies) {
        const pendency = fur.pendencies.find(p => p.id === pendencyId);
        if(pendency) {
            pendency.isResolved = !pendency.isResolved;
            setProject(newProject);
        }
      }
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{furniture.name}</DialogTitle>
          <DialogDescription>
            Use este espaço para conversas e para registrar pendências.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-hidden">
            {/* Pendencies */}
            <div className="flex flex-col gap-4">
                <h3 className="font-semibold text-lg">Pendências</h3>
                <div className="space-y-2 flex-1">
                    <ScrollArea className="h-full pr-4">
                    {furniture.pendencies && furniture.pendencies.length > 0 ? (
                        furniture.pendencies.map(p => (
                            <div key={p.id} className="flex items-center space-x-2 py-1">
                                <Checkbox id={p.id} checked={p.isResolved} onCheckedChange={() => handleTogglePendency(p.id)} />
                                <label htmlFor={p.id} className={`text-sm ${p.isResolved ? 'line-through text-muted-foreground' : ''}`}>
                                    {p.text}
                                </label>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pendência.</p>
                    )}
                    </ScrollArea>
                </div>
                <div className="flex gap-2">
                    <Input 
                        value={newPendency}
                        onChange={(e) => setNewPendency(e.target.value)}
                        placeholder="Nova pendência..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPendency()}
                        disabled={!currentMember}
                    />
                    <Button onClick={handleAddPendency} disabled={!currentMember}>Adicionar</Button>
                </div>
            </div>
            {/* Chat */}
            <div className="flex flex-col gap-4 border-l pl-4">
                 <h3 className="font-semibold text-lg">Conversa</h3>
                 <div className="flex-1">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-4">
                            {furniture.comments && furniture.comments.length > 0 ? (
                                furniture.comments.map(c => {
                                    const member = memberMap.get(c.memberId);
                                    return (
                                        <div key={c.id} className="flex gap-2 text-sm">
                                            {member && <span className="h-5 w-5 rounded-full flex-shrink-0" style={{backgroundColor: member.color}}></span>}
                                            <div>
                                                <span className="font-semibold">{member?.name || 'Desconhecido'}</span>
                                                <p className="text-muted-foreground">{c.text}</p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário.</p>
                            )}
                        </div>
                    </ScrollArea>
                 </div>
                 <div className="flex gap-2">
                    <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escreva um comentário..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        disabled={!currentMember}
                    />
                    <Button onClick={handleAddComment} disabled={!currentMember}>Enviar</Button>
                </div>
            </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
