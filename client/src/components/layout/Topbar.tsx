import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, Menu } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

interface TopbarProps {
  onMobileMenuToggle: () => void;
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileMenuToggle, title }) => {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // poll notifications every 30 seconds for live updates
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const togglePanel = () => setIsOpen(!isOpen);

  return (
    <header className="h-16 border-b border-white/10 bg-bg-card/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Page Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded hover:bg-white/5 text-text-secondary hover:text-text-primary"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-display font-bold text-lg text-text-primary">{title}</h1>
      </div>

      {/* Notification Center Trigger */}
      <div className="relative">
        <button
          onClick={togglePanel}
          className="p-2 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors relative"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-accent-warm text-text-primary text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Slide-out Notification Drawer */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay */}
              <div className="fixed inset-0 z-40" onClick={togglePanel} />
              
              {/* Drawer Container */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 z-50 w-80 md:w-96 bg-bg-card/95 border-l border-white/10 shadow-2xl flex flex-col backdrop-blur-xl"
              >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-bold text-text-primary">Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="bg-accent-primary/20 text-accent-primary text-xs px-2 py-0.5 rounded-full font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs font-semibold text-accent-primary hover:underline px-2 py-1"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={togglePanel}
                      className="p-1.5 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 text-text-muted">
                      <Bell size={40} className="stroke-1 mb-2 opacity-55" />
                      <p className="font-semibold text-sm">All clear!</p>
                      <p className="text-xs max-w-xs mt-1">You will receive notifications here for habits, water reminders, and tasks.</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      let typeColor = 'bg-accent-primary/10 text-accent-primary border-accent-primary/20';
                      if (n.type === 'water') typeColor = 'bg-accent-secondary/10 text-accent-secondary border-accent-secondary/20';
                      if (n.type === 'task') typeColor = 'bg-accent-warm/10 text-accent-warm border-accent-warm/20';
                      if (n.type === 'streak') typeColor = 'bg-accent-gold/10 text-accent-gold border-accent-gold/20';

                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-card border transition-all duration-300 relative ${n.read ? 'bg-white/[0.01] border-white/5 opacity-60' : 'bg-white/[0.03] border-white/10 shadow-[0_4px_12px_rgba(108,99,255,0.02)]'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${typeColor}`}>
                                  {n.type}
                                </span>
                                <span className="text-[10px] text-text-muted font-mono">
                                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-text-primary mt-1.5 leading-snug">{n.title}</h4>
                              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{n.message}</p>
                            </div>
                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                              {!n.read && (
                                <button
                                  onClick={() => markRead(n.id)}
                                  className="p-1 rounded bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 border border-accent-primary/20 transition-colors"
                                  title="Mark as read"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(n.id)}
                                className="p-1 rounded bg-white/5 text-text-muted hover:text-accent-warm border border-white/5 hover:border-accent-warm/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
