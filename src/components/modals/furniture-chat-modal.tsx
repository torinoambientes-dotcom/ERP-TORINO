'use client';
import { useContext, useState, useMemo, useCallback } from 'react';
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
  onUpdate: (furniture: Furniture) => void;
}

export function FurnitureChatModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
}: FurnitureChatModalProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('FurnitureChatModal must be used within an AppProvider');
  }
  const { teamMembers } = context;

  const [newComment, setNewComment] = useState('');
  const [newPendency, setNewPendency] = useState('');
  
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
    
    const updatedFurniture = { 
      ...furniture, 
      comments: [...(furniture.comments || []), comment] 
    };
    onUpdate(updatedFurniture);
    setNewComment('');
  };

  const handleAddPendency = () => {
    if (!newPendency.trim() || !selectedMemberId) return;

    const pendency: Pendency = {
      id: generateId('pend'),
      text: newPendency,
      isResolved: false,
      authorId: selectedMemberId,
    };

    const updatedFurniture = { 
      ...furniture, 
      pendencies: [...(furniture.pendencies || []), pendency] 
    };
    onUpdate(updatedFurniture);
    setNewPendency('');
  };

  const handleTogglePendency = (pendencyId: string) => {
    const updatedPendencies = (furniture.pendencies || []).map(p => 
      p.id === pendencyId ? { ...p, isResolved: !p.isResolved } : p
    );
    onUpdate({ ...furniture, pendencies: updatedPendencies });
  };

  const UserSelector = () => (
    <div className='mb-2'>
        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
          <SelectTrigger className="w-full">
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

  const safePendencies = furniture.pendencies || [];
  const safeComments = furniture.comments || [];


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{furniture.name}</DialogTitle>
          <DialogDescription>
            Use este espaço para conversas e para registrar pendências.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pendencies" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pendencies">Pendências ({safePendencies.length})</TabsTrigger>
            <TabsTrigger value="chat">Conversa ({safeComments.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pendencies" className="flex-grow flex flex-col mt-4 overflow-hidden">
            <ScrollArea className="h-full pr-4 flex-grow">
              <div className="space-y-3">
                {safePendencies.length > 0 ? (
                  safePendencies.map((p) => (
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
                          p.isResolved ? 'line-through text-muted-foreground' : ''
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
             <Separator className="my-4" />
             <UserSelector />
            <div className="flex gap-2 mt-2">
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

          <TabsContent value="chat" className="flex-grow flex flex-col mt-4 overflow-hidden">
             <ScrollArea className="h-full pr-4 flex-grow">
              <div className="space-y-4">
                {safeComments.length > 0 ? (
                  safeComments.map((c) => {
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
                          <p className="text-muted-foreground break-words">{c.text}</p>
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
             <Separator className="my-4" />
             <UserSelector />
            <div className="flex gap-2 mt-2">
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

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
