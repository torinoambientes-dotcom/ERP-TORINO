'use client';
import { useContext, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { RegisterTeamModal } from '@/components/modals/register-team-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TeamMember } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function TeamPage() {
  const { teamMembers, deleteTeamMember, isLoading } = useContext(AppContext);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  
  const { marceneiros, outrosMembros } = useMemo(() => {
    const marceneiros: TeamMember[] = [];
    const outrosMembros: TeamMember[] = [];
    teamMembers.forEach(member => {
      if (member.role === 'Marceneiro') {
        marceneiros.push(member);
      } else {
        outrosMembros.push(member);
      }
    });
    return { marceneiros, outrosMembros };
  }, [teamMembers]);


  const handleOpenModal = (member: TeamMember | null = null) => {
    setMemberToEdit(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setMemberToEdit(null);
    setIsModalOpen(false);
  };

  const handleOpenAlert = (member: TeamMember) => {
    setMemberToDelete(member);
    setIsAlertOpen(true);
  };

  const handleCloseAlert = () => {
    setMemberToDelete(null);
    setIsAlertOpen(false);
  };

  const handleConfirmDelete = () => {
    if (memberToDelete) {
      deleteTeamMember(memberToDelete.id);
      toast({
        title: 'Membro removido',
        description: `${memberToDelete.name} foi removido(a) da equipe.`,
      });
    }
    handleCloseAlert();
  };

  const renderMemberList = (members: TeamMember[]) => {
    if (members.length === 0) {
      return (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Nenhum membro nesta categoria.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-4">
              <Avatar>
                {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                <AvatarFallback style={{ backgroundColor: member.color }}>
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">{member.role}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenModal(member)}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive/80 hover:text-destructive"
                onClick={() => handleOpenAlert(member)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remover</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando equipe...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Equipe"
            description="Gerencie os membros da sua equipe e suas credenciais de acesso."
          />
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        <div className='space-y-8'>
          <Card>
            <CardHeader>
              <CardTitle>Marceneiros</CardTitle>
              <CardDescription>
                Membros responsáveis pela pré-montagem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderMemberList(marceneiros)}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Outros Membros</CardTitle>
              <CardDescription>
                Demais membros da equipe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderMemberList(outrosMembros)}
            </CardContent>
          </Card>
        </div>

      </div>

      <RegisterTeamModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        memberToEdit={memberToEdit}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente{' '}
              <span className="font-bold">{memberToDelete?.name}</span> da equipe e seu acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseAlert}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
