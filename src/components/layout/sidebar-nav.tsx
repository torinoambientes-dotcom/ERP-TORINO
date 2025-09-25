'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutGrid, PlusCircle, Users } from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { RegisterProjectModal } from '../modals/register-project-modal';
import { RegisterTeamModal } from '../modals/register-team-modal';
import { Button } from '../ui/button';

const menuItems = [
  { href: '/', label: 'Projetos', icon: LayoutGrid },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [isTeamModalOpen, setTeamModalOpen] = useState(false);

  return (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center justify-center gap-2 w-full">
          <Logo className="h-10 w-auto" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-base">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='mt-auto'>
         <SidebarSeparator />
         <div className="p-2 space-y-2">
           <Button
            onClick={() => setProjectModalOpen(true)}
            variant="default"
            className="w-full justify-start"
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-base">Novo Projeto</span>
          </Button>
           <Button
            onClick={() => setTeamModalOpen(true)}
            variant="secondary"
            className="w-full justify-start"
          >
            <Users className="h-5 w-5" />
            <span className="text-base">Nova Equipe</span>
          </Button>
         </div>
      </SidebarFooter>

      <RegisterProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
      <RegisterTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setTeamModalOpen(false)}
      />
    </>
  );
}
