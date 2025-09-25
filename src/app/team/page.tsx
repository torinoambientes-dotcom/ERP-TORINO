'use client';
import { useContext, useState } from 'react';
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

export default function TeamPage() {
  const { teamMembers, deleteTeamMember, isLoading } = useContext(AppContext);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

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
            description="Gerencie os membros da sua equipe."
          />
          <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>
              Visualize, edite ou remova membros da sua equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-8 w-8 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className="font-medium">{member.name}</span>
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
                ))
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Nenhum membro na equipe.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
              <span className="font-bold">{memberToDelete?.name}</span> da equipe.
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
