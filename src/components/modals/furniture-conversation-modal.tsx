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
import { AppContext } from '@/context/app-context';
import type { Furniture, Comment } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { generateId } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUser } from '@/firebase';

interface FurnitureConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: Furniture;
  onUpdate: (furniture: Furniture) => void;
}

export function FurnitureConversationModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
}: FurnitureConversationModalProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('FurnitureConversationModal must be used within an AppProvider');
  }
  const { teamMembers } = context;
  const { user } = useUser();

  const [newComment, setNewComment] = useState('');
  
  const memberMap = useMemo(() => {
    return new Map(teamMembers.map((m) => [m.id, m]));
  }, [teamMembers]);

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const handleAddComment = () => {
    if (!newComment.trim() || !loggedInMember) return;

    const comment: Comment = {
      id: generateId('comm'),
      memberId: loggedInMember.id,
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

  const safeComments = furniture.comments || [];


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-xl h-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Conversa sobre "{furniture.name}"</DialogTitle>
          <DialogDescription>
            Use este espaço para registrar decisões, fazer perguntas ou deixar comentários.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex flex-col overflow-hidden py-4">
          <ScrollArea className="h-full pr-4 flex-grow min-h-[200px]">
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
        </div>
        
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            disabled={!loggedInMember}
          />
          <Button onClick={handleAddComment} disabled={!loggedInMember}>
            Enviar
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
