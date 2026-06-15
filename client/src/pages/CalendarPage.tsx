import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { DatePicker } from '../components/ui/DatePicker';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { request } from '../lib/api';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Tag,
  CheckCircle
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addHours
} from 'date-fns';
import toast from 'react-hot-toast';

export const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMarkDayOpen, setIsMarkDayOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Event form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('#6C63FF');
  const [type, setType] = useState('custom');

  // Mark Day form state
  const [markerLabel, setMarkerLabel] = useState('');
  const [markerColor, setMarkerColor] = useState('#FFD166'); // default gold

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 }
    })
  );

  const loadEvents = async () => {
    try {
      setLoading(true);
      const start = startOfWeek(startOfMonth(currentMonth)).toISOString();
      const end = endOfWeek(endOfMonth(currentMonth)).toISOString();
      const data = await request(`/events?start=${start}&end=${end}`);
      setEvents(data);
    } catch (e: any) {
      toast.error(e.message || 'Error loading calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleCellClick = (date: Date) => {
    setSelectedDate(date);
    const startStr = format(date, "yyyy-MM-dd'T'09:00");
    const endStr = format(date, "yyyy-MM-dd'T'10:00");
    
    // Reset Form
    setSelectedEvent(null);
    setTitle('');
    setDescription('');
    setStartTime(startStr);
    setEndTime(endStr);
    setColor('#6C63FF');
    setType('custom');
    
    setIsEventModalOpen(true);
  };

  const handleCellRightClick = (date: Date, e: React.MouseEvent) => {
    e.preventDefault(); // prevent system context menu
    setSelectedDate(date);
    setMarkerLabel('');
    setMarkerColor('#FFD166');
    setIsMarkDayOpen(true);
  };

  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering cell click
    setSelectedEvent(event);
    setTitle(event.title.replace(/📋 |🧘 |💧 |🏋️ /g, ''));
    setDescription(event.description || '');
    setStartTime(format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"));
    setColor(event.color || '#6C63FF');
    setType(event.type || 'custom');
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime || !endTime) return;

    try {
      if (selectedEvent) {
        // Update
        await request(`/events/${selectedEvent.id}`, {
          method: 'PATCH',
          body: {
            title,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            color,
          },
        });
        toast.success('Event rescheduled!');
      } else {
        // Create
        await request('/events', {
          method: 'POST',
          body: {
            title,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            color,
            type,
          },
        });
        toast.success('Event mapped to timeline!');
      }
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await request(`/events/${selectedEvent.id}`, { method: 'DELETE' });
      toast.success('Event deleted');
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMarkDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markerLabel.trim() || !selectedDate) return;

    try {
      // Marked day is logged as a calendar event with isMarked=true
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);

      await request('/events', {
        method: 'POST',
        body: {
          title: `📌 Marker: ${markerLabel}`,
          description: 'Custom day marker label',
          startTime: start,
          endTime: end,
          color: markerColor,
          type: 'marker',
          isMarked: true,
          markerLabel,
        },
      });

      toast.success('Day marked!');
      setIsMarkDayOpen(false);
      loadEvents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Drag-and-drop event rescheduling
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const eventId = active.id as string;
    const targetDateStr = over.id as string; // YYYY-MM-DD format of target day cell

    const movingEvent = events.find(e => e.id === eventId);
    if (!movingEvent) return;

    // Check if habit (pseudo habit events are read-only)
    if (eventId.startsWith('habit-')) {
      toast.error('Habits schedules cannot be dragged. Modify the habit category.');
      return;
    }

    try {
      // Calculate target time range preserving hours/minutes
      const originalStart = new Date(movingEvent.startTime);
      const originalEnd = new Date(movingEvent.endTime);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      const [year, month, day] = targetDateStr.split('-').map(Number);
      const targetStart = new Date(year, month - 1, day);
      targetStart.setHours(originalStart.getHours(), originalStart.getMinutes());
      const targetEnd = new Date(targetStart.getTime() + durationMs);

      // Optimistic local update
      const updatedEvents = events.map(e =>
        e.id === eventId ? { ...e, startTime: targetStart, endTime: targetEnd } : e
      );
      setEvents(updatedEvents);

      await request(`/events/${eventId}`, {
        method: 'PATCH',
        body: {
          startTime: targetStart,
          endTime: targetEnd,
        },
      });

      toast.success('Event rescheduled!');
      loadEvents();
    } catch (e: any) {
      toast.error(e.message || 'Rescheduling sync failed');
      loadEvents(); // rollback
    }
  };

  // Compile Calendar Grid cells
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="space-y-6 pb-12">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-text-primary">Time Matrix</h2>
          <p className="text-xs text-text-secondary mt-1">
            Right-click cells to mark days with color codes. Drag custom events or tasks to reschedule.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-bg-card border border-white/10 px-3 py-1.5 rounded-full glass-panel">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-text-primary">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold font-display uppercase tracking-wider text-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-white/5 rounded text-text-secondary hover:text-text-primary">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid wrapper */}
      {loading && events.length === 0 ? (
        <SkeletonLoader type="list" className="h-[400px]" />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="glass-panel overflow-hidden bg-bg-card/20 border border-white/10">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 bg-white/[0.02] border-b border-white/10 text-center py-2 text-[10px] uppercase font-bold text-text-secondary tracking-wider font-mono">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-white/5 border-b border-r border-white/5 min-h-[500px]">
              {days.map((day, idx) => {
                const isCurrent = isSameMonth(day, currentMonth);
                const isTodayDate = isSameDay(day, new Date());
                const cellId = format(day, 'yyyy-MM-dd');

                // Filter events inside this day
                const dayEvents = events.filter(e => isSameDay(new Date(e.startTime), day) && !e.isMarked);
                const dayMarkers = events.filter(e => isSameDay(new Date(e.startTime), day) && e.isMarked);

                return (
                  <div
                    key={idx}
                    id={cellId}
                    onClick={() => handleCellClick(day)}
                    onContextMenu={(e) => handleCellRightClick(day, e)}
                    className={`p-2 flex flex-col gap-1.5 transition-all min-h-[90px] cursor-pointer hover:bg-white/[0.01] ${isCurrent ? 'bg-transparent' : 'bg-white/[0.01] opacity-40'}`}
                  >
                    {/* Day Number Header */}
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-mono font-bold ${isTodayDate ? 'h-5 w-5 bg-accent-primary text-text-primary rounded-full flex items-center justify-center' : 'text-text-secondary'}`}>
                        {format(day, 'd')}
                      </span>
                      
                      {/* Marked dots */}
                      <div className="flex gap-0.5">
                        {dayMarkers.map((m) => (
                          <div
                            key={m.id}
                            title={m.markerLabel}
                            className="h-1.5 w-1.5 rounded-full animate-bounce"
                            style={{ backgroundColor: m.color }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Events List container */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[70px] pr-0.5">
                      {dayEvents.map((e) => (
                        <div
                          key={e.id}
                          id={e.id}
                          onClick={(evt) => handleEventClick(e, evt)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold truncate transition-all cursor-grab active:cursor-grabbing border border-white/10"
                          style={{
                            backgroundColor: `${e.color}15`,
                            color: e.color,
                            borderLeftWidth: '3px',
                            borderLeftColor: e.color
                          }}
                          title={`${e.title} (${format(new Date(e.startTime), 'HH:mm')})`}
                        >
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DndContext>
      )}

      {/* Event Details/Add Modal */}
      <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={selectedEvent ? 'Calendar Sync Settings' : 'Schedule Event'}>
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <Input
            label="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Launch project milestone..."
            required
            disabled={selectedEvent?.id?.startsWith('habit-')}
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Sync notes or location links..."
            disabled={selectedEvent?.id?.startsWith('habit-')}
          />

          <div className="flex gap-4">
            <div className="w-1/2">
              <Input
                label="Start Time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={selectedEvent?.id?.startsWith('habit-')}
              />
            </div>
            <div className="w-1/2">
              <Input
                label="End Time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={selectedEvent?.id?.startsWith('habit-')}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-1/2">
              <Dropdown
                label="Category Type"
                options={[
                  { value: 'custom', label: 'Custom 📅' },
                  { value: 'health', label: 'Health Milestones 🟢' },
                  { value: 'focus', label: 'Focus Blocks 🟡' },
                ]}
                value={type}
                onChange={setType}
              />
            </div>
            <div className="w-1/2">
              <Dropdown
                label="Event Color"
                options={[
                  { value: '#6C63FF', label: 'Indigo 🟣' },
                  { value: '#00D4AA', label: 'Mint 🟢' },
                  { value: '#FF6B6B', label: 'Coral 🔴' },
                  { value: '#FFD166', label: 'Amber 🟡' },
                ]}
                value={color}
                onChange={setColor}
              />
            </div>
          </div>

          <div className="flex gap-4 border-t border-white/10 pt-4 mt-6">
            {!selectedEvent?.id?.startsWith('habit-') && (
              <Button type="submit" variant="primary" className="flex-1 py-2.5 font-bold">
                {selectedEvent ? 'Reschedule' : 'Save Event'}
              </Button>
            )}
            {selectedEvent && (
              <Button
                type="button"
                variant="danger"
                className="py-2.5 px-4 font-bold"
                onClick={handleDeleteEvent}
              >
                Delete
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Mark Day Modal (Right-Click popup) */}
      <Modal isOpen={isMarkDayOpen} onClose={() => setIsMarkDayOpen(false)} title="Mark Calendar Day">
        <form onSubmit={handleMarkDay} className="space-y-4">
          <Input
            label="Day Marker Label"
            value={markerLabel}
            onChange={(e) => setMarkerLabel(e.target.value)}
            placeholder="Birthday, Anniversary, Doctor visit..."
            required
            autoFocus
          />

          <Dropdown
            label="Marker Color Code"
            options={[
              { value: '#FFD166', label: 'Amber Yellow 🟡' },
              { value: '#FF6B6B', label: 'Coral Red 🔴' },
              { value: '#00D4AA', label: 'Mint Green 🟢' },
              { value: '#6C63FF', label: 'Electric Violet 🟣' },
            ]}
            value={markerColor}
            onChange={setMarkerColor}
          />

          <Button type="submit" variant="primary" className="w-full mt-6 py-2.5 font-bold">
            Apply Marker Dot
          </Button>
        </form>
      </Modal>
    </div>
  );
};
