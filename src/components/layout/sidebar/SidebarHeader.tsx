
import React from 'react';
import { SidebarHeader } from '@/components/ui/sidebar';

export const AppSidebarHeader = () => {
  return (
    <SidebarHeader className="border-b border-purple-700/30 p-6 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <div className="relative h-16 w-16 group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 via-purple-500/30 to-blue-500/30 rounded-xl blur-lg"></div>
          <div className="relative h-16 w-16 bg-gradient-to-br from-slate-900 via-purple-900/50 to-blue-900/50 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <img src="/cleaned_logo.png" alt="Smart Finance AI" className="h-14 w-14 object-contain" />
          </div>
        </div>
        <div>
          <h2 className="text-purple-100 font-bold text-sm">SmartFinanceAI</h2>
          <p className="text-purple-200 text-xs">Financial OS</p>
        </div>
      </div>
    </SidebarHeader>
  );
};
