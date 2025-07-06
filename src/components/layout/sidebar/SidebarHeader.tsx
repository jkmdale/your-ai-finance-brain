
import React from 'react';
import { SidebarHeader } from '@/components/ui/sidebar';

export const AppSidebarHeader = () => {
  return (
    <SidebarHeader className="border-b border-purple-200/20 p-6 bg-purple-900/80 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
          <img src="/logo.png" alt="Smart Finance AI" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <h2 className="text-purple-100 font-bold text-sm">SmartFinanceAI</h2>
          <p className="text-purple-200 text-xs">Financial OS</p>
        </div>
      </div>
    </SidebarHeader>
  );
};
