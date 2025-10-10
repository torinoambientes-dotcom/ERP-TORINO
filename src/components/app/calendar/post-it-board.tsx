'use client';
import { useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AppContext } from '@/context/app-context';
import type { PostItNote } from '@/lib/types';
import { format } from 'date-fns';
import { cn, generateId } from '@/lib/utils';
import { Plus, Trash2, StickyNote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from 'use-debounce';

const postItColors = [
    'bg-yellow-200', 'bg-green-200', 'bg-blue-200',
    'bg-pink-200', 'bg-purple-200', 'bg-orange-200'
];
const postItTextColors = [
    'text-yellow-800', 'text-green-800', 'text-blue-800',
    'text-pink-800', 'text-purple-800', 'text-orange-800'
]
const postItBorderColors = [
    'border-yellow-300', 'border-green-300', 'border-blue-300',
    'border-pink-300', 'border-purple-300', 'border-orange-300'
]


interface PostItBoardProps {
  selectedDate: Date | undefined;
  isDashboard?: boolean;
}

export function PostItBoard({ selectedDate, isDashboard = false }: PostItBoardProps) {
  const { postItNotes, addPostItNote, updatePostItNote, deletePostItNote } = useContext(AppContext);

  const [notesForDay, setNotesForDay] = useState<PostItNote[]>([]);
  
  useEffect(() => {
    if (selectedDate) {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      setNotesForDay(postItNotes.filter(note => note.date === dateKey));
    }
  }, [selectedDate, postItNotes]);
  
  const handleAddNote = () => {
    if (!selectedDate) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newNote: Omit<PostItNote, 'id' | 'memberId'> = {
      content: '',
      color: 'bg-yellow-200',
      date: dateKey,
    };
    addPostItNote(newNote);
  };

  const handleNoteChange = (noteId: string, content: string) => {
    setNotesForDay(prev => prev.map(n => n.id === noteId ? { ...n, content } : n));
    // Debounced update will be called via the DebouncedTextarea component
  };

  const handleColorChange = (noteId: string, color: string) => {
    updatePostItNote(noteId, { color });
  };
  
  const handleDeleteNote = (noteId: string) => {
    deletePostItNote(noteId);
  }

  return (
    <Card className={cn(isDashboard && 'border-none shadow-none')}>
      {!isDashboard && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Lembretes do Dia
          </CardTitle>
          <CardDescription>
            {selectedDate ? `Notas para ${format(selectedDate, 'PPP')}` : 'Selecione um dia'}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        {selectedDate ? (
          <div className="space-y-3">
             {notesForDay.length > 0 ? (
                notesForDay.map((note, index) => {
                  const colorIndex = postItColors.indexOf(note.color);
                  const textColor = postItTextColors[colorIndex] || 'text-gray-800';
                  const borderColor = postItBorderColors[colorIndex] || 'border-gray-300';
                  return (
                    <div key={note.id} className={cn("p-2 rounded-md border relative group", note.color, borderColor)}>
                        <DebouncedTextarea
                            value={note.content}
                            onChange={(e) => handleNoteChange(note.id, e.target.value)}
                            onDebouncedChange={(value) => updatePostItNote(note.id, { content: value })}
                            className={cn("bg-transparent border-none focus-visible:ring-0 text-sm resize-none h-auto min-h-[60px]", textColor)}
                            placeholder="Escreva seu lembrete..."
                        />
                        <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <div className={cn("w-3 h-3 rounded-full", note.color)} />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-1">
                                    <div className="flex gap-1">
                                        {postItColors.map(color => (
                                            <Button
                                                key={color}
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleColorChange(note.id, color)}
                                            >
                                                <div className={cn("w-4 h-4 rounded-full", color)} />
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteNote(note.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                  )
                })
             ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum lembrete para este dia.</p>
             )}
             <Button variant="outline" size="sm" className="w-full" onClick={handleAddNote}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Lembrete
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Selecione um dia no calendário para ver ou adicionar notas.</p>
        )}
      </CardContent>
    </Card>
  );
}

// A simple textarea component that debounces its onChange callback
function DebouncedTextarea({ onDebouncedChange, ...props }: React.ComponentProps<typeof Textarea> & { onDebouncedChange: (value: string) => void }) {
    const [debouncedValue] = useDebounce(props.value, 500);

    useEffect(() => {
        onDebouncedChange(debouncedValue as string);
    }, [debouncedValue, onDebouncedChange]);

    return <Textarea {...props} />;
}
