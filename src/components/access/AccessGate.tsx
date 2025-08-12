import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { AccessModal } from "./AccessModal";
import { useLocation } from "react-router-dom";

/**
 * Global gate that blocks interaction with the entire app
 * until user is authenticated and has active subscription.
 * Admins bypass the gate.
 */
export default function AccessGate() {
  const { loading, isAdmin, user } = useAuth();
  const { isActive } = useSubscription();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Lock while loading to avoid content flashing, skip for admin routes
  const locked = !isAdminRoute && !isAdmin && (loading || !user || !isActive);

  useEffect(() => {
    if (locked) {
      document.documentElement.classList.add('overflow-hidden');
      document.body.classList.add('overflow-hidden');
    } else {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }, [locked]);

  if (!locked) return null;

  // Cover the whole page and block pointer/keyboard interactions
  return (
    <div className="fixed inset-0 z-[999] pointer-events-auto">
      {/* make everything behind inert for screen readers */}
      <div aria-hidden="true" className="fixed inset-0" />
      <AccessModal />
    </div>
  );
}
