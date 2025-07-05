
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

export const useSidebarHandlers = () => {
  const { setOpenMobile, isMobile } = useSidebar();
  const { signOut } = useAuth();

  const handleSectionClick = (url: string) => {
    // For hash links, handle scrolling to element with ID
    const element = document.getElementById(url);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // If element doesn't exist, scroll to top and let user know
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log(`Section ${url} not found, scrolling to top`);
    }
    
    // Close mobile sidebar after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Close mobile sidebar after sign out
      if (isMobile) {
        setOpenMobile(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return {
    handleSectionClick,
    handleSignOut,
  };
};
