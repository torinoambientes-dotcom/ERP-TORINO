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
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { RegisterProjectModal } from '../modals/register-project-modal';
import { RegisterTeamModal } from '../modals/register-team-modal';

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
        <Link href="/" className="flex items-center gap-2" legacyBehavior>
          <a className="flex items-center gap-2">
            <Logo className="h-10 w-auto text-primary" />
          </a>
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
              >
                <Link href={item.href} legacyBehavior>
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span className="text-base">{item.label}</span>
                  </a>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="mt-auto p-4 space-y-2">
          <SidebarMenuButton
            onClick={() => setProjectModalOpen(true)}
            variant="outline"
            className="w-full justify-start border-dashed"
          >
            <PlusCircle className="h-5 w-5" />
            <span className="text-base">Cadastrar Projeto</span>
          </SidebarMenuButton>
          <SidebarMenuButton
            onClick={() => setTeamModalOpen(true)}
            variant="outline"
            className="w-full justify-start border-dashed"
          >
            <Users className="h-5 w-5" />
            <span className="text-base">Cadastrar Equipe</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>

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
