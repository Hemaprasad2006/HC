import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Dropdown } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { DatePicker } from '../components/ui/DatePicker';
import { request } from '../lib/api';
import {
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Check,
  Filter,
  CheckSquare,
  Layers,
  ListTodo
} from 'lucide-react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCorners
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import toast from 'react-hot-toast';
import { format, isToday, isFuture } from 'date-fns';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'kanban' | 'all'>('today');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState('4');
  const [project, setProject] = useState('Life Director');
  const [tags, setTags] = useState<string>('');
  const [subtasks, setSubtasks] = useState<{ title: string; isDone: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Bulk action selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // enables clicking edit buttons without triggering drag immediately
      },
    })
  );

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await request('/tasks');
      setTasks(data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();

    const query = new URLSearchParams(window.location.search);
    if (query.get('create') === 'true') {
      setIsCreateOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      await request('/tasks', {
        method: 'POST',
        body: {
          title,
          description,
          dueDate: dueDate || null,
          priority: parseInt(priority),
          project,
          tags: parsedTags,
          subtasks,
        },
      });

      toast.success('Task logged!');
      setIsCreateOpen(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('4');
      setProject('Life Director');
      setTags('');
      setSubtasks([]);

      loadTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      const parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : tags;
      await request(`/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        body: {
          title,
          description,
          dueDate: dueDate || null,
          priority: parseInt(priority),
          project,
          tags: parsedTags,
          subtasks,
        },
      });

      toast.success('Task updated!');
      setIsEditOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenEdit = (task: any) => {
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
    setPriority(task.priority.toString());
    setProject(task.project || 'General');
    setTags(task.tags ? task.tags.join(', ') : '');
    setSubtasks(task.subtasks || []);
    setIsEditOpen(true);
  };

  const handleToggleComplete = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await request(`/tasks/${taskId}/complete`, {
        method: 'PATCH',
      });
      loadTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await request(`/tasks/${taskId}`, { method: 'DELETE' });
      toast.success('Task deleted');
      loadTasks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Add subtask inline in forms
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), isDone: false }]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  // Bulk actions handlers
  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const activeTasks = getFilteredTasks();
    if (selectedIds.length === activeTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeTasks.map(t => t.id));
    }
  };

  const handleBulkComplete = async () => {
    try {
      await request('/tasks/bulk-complete', {
        method: 'POST',
        body: { ids: selectedIds, status: 'done' },
      });
      toast.success('Tasks updated');
      setSelectedIds([]);
      loadTasks();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete all ${selectedIds.length} tasks?`)) return;
    try {
      await request('/tasks/bulk-delete', {
        method: 'POST',
        body: { ids: selectedIds },
      });
      toast.success('Tasks deleted');
      setSelectedIds([]);
      loadTasks();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkPriority = async (p: number) => {
    try {
      await request('/tasks/bulk-priority', {
        method: 'POST',
        body: { ids: selectedIds, priority: p },
      });
      toast.success(`Priority updated to P${p}`);
      setSelectedIds([]);
      loadTasks();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Kanban Drag and Drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const targetStatus = over.id as 'todo' | 'in_progress' | 'done';

    // Optimistic local state update
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: targetStatus } : t
    );
    setTasks(updatedTasks);

    try {
      await request(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: targetStatus },
      });
    } catch (e) {
      toast.error('Failed syncing task status to database');
      loadTasks(); // rollback
    }
  };

  // Filters logic
  const getFilteredTasks = () => {
    if (activeTab === 'today') {
      return tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'done');
    }
    if (activeTab === 'upcoming') {
      return tasks.filter(t => t.dueDate && isFuture(new Date(t.dueDate)) && t.status !== 'done');
    }
    return tasks; // all or kanban view (both use raw lists)
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-text-primary">Task Command</h2>
          <p className="text-xs text-text-secondary mt-1">
            Group by projects, view schedule pipelines, and manage your Kanban console.
          </p>
        </div>
        <Button variant="primary" size="sm" className="flex items-center gap-1.5" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} />
          New Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center border-b border-white/10">
        <div className="flex gap-4">
          {[
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'kanban', label: 'Kanban Board' },
            { id: 'all', label: 'All Tasks' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedIds([]);
              }}
              className={`py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab.id ? 'border-accent-primary text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-card flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <span className="text-xs font-bold text-accent-primary font-mono">{selectedIds.length} tasks selected</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleBulkComplete} className="text-xs py-1.5 px-3">
              ✓ Complete Selected
            </Button>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(p => (
                <button
                  key={p}
                  onClick={() => handleBulkPriority(p)}
                  className="px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/10 rounded border border-white/10 text-text-secondary hover:text-text-primary font-mono"
                >
                  P{p}
                </button>
              ))}
            </div>
            <Button variant="danger" size="sm" onClick={handleBulkDelete} className="text-xs py-1.5 px-3">
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {loading && tasks.length === 0 ? (
        <SkeletonLoader type="list" />
      ) : (
        <>
          {/* LIST VIEWS (Today, Upcoming, All Tasks) */}
          {activeTab !== 'kanban' && (
            <div className="glass-panel overflow-hidden bg-bg-card/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === getFilteredTasks().length && getFilteredTasks().length > 0}
                        onChange={toggleSelectAll}
                        className="rounded bg-white/5 border-white/10 text-accent-primary"
                      />
                    </th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Task Name</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Tags</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {getFilteredTasks().length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-text-muted italic">
                        All clear! No tasks matched this layout views filter.
                      </td>
                    </tr>
                  ) : (
                    getFilteredTasks().map((t) => {
                      let priorityColor = 'bg-accent-warm'; // P1
                      if (t.priority === 2) priorityColor = 'bg-accent-gold';
                      if (t.priority === 3) priorityColor = 'bg-accent-primary';
                      if (t.priority === 4) priorityColor = 'bg-text-muted';

                      const checked = selectedIds.includes(t.id);

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-white/[0.01] transition-all text-xs ${t.status === 'done' ? 'opacity-55 line-through' : ''}`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelectRow(t.id)}
                              className="rounded bg-white/5 border-white/10 text-accent-primary"
                            />
                          </td>
                          <td className="p-4">
                            <span className="flex items-center gap-1.5 font-mono font-bold">
                              <span className={`h-2.5 w-2.5 rounded-full ${priorityColor}`} />
                              P{t.priority}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-text-primary">
                            <div className="flex flex-col">
                              <span>{t.title}</span>
                              {t.subtasks && t.subtasks.length > 0 && (
                                <span className="text-[10px] text-text-secondary font-mono mt-0.5">
                                  Subtasks: {t.subtasks.filter((st: any) => st.isDone).length}/{t.subtasks.length} Done
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-text-secondary">{t.project || 'General'}</td>
                          <td className="p-4 font-mono font-bold text-text-secondary">
                            {t.dueDate ? format(new Date(t.dueDate), 'MMM dd, yyyy') : 'No Limit'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1 flex-wrap">
                              {t.tags && t.tags.map((tag: string, idx: number) => (
                                <Badge key={idx} color="gray">{tag}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button variant="ghost" size="sm" className="px-2" onClick={() => handleToggleComplete(t.id)}>
                              {t.status === 'done' ? 'Undo' : 'Complete'}
                            </Button>
                            <Button variant="secondary" size="sm" className="px-2" onClick={() => handleOpenEdit(t)}>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* KANBAN BOARD VIEW */}
          {activeTab === 'kanban' && (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'todo', label: 'To Do', color: 'bg-accent-primary' },
                  { id: 'in_progress', label: 'In Progress', color: 'bg-accent-gold' },
                  { id: 'done', label: 'Done', color: 'bg-accent-secondary' },
                ].map((col) => {
                  const colTasks = tasks.filter(t => t.status === col.id);

                  return (
                    <div
                      key={col.id}
                      id={col.id}
                      className="glass-panel p-4 flex flex-col gap-4 bg-bg-card/20 min-h-[500px]"
                    >
                      {/* Column Header */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${col.color}`} />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-text-primary">{col.label}</h4>
                        </div>
                        <span className="font-mono text-xs font-bold text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                          {colTasks.length}
                        </span>
                      </div>

                      {/* Dropzone container */}
                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                        {colTasks.length === 0 ? (
                          <div className="flex-1 border border-dashed border-white/5 rounded-card flex items-center justify-center py-12 text-text-muted text-xs italic">
                            Empty Dropzone
                          </div>
                        ) : (
                          colTasks.map((t) => (
                            <Card
                              key={t.id}
                              variant="solid"
                              className="p-4 space-y-3 cursor-grab active:cursor-grabbing hover:scale-[1.01] transition-transform"
                              style={{
                                borderLeftWidth: '4px',
                                borderLeftColor:
                                  t.priority === 1 ? 'var(--color-accent-warm)' :
                                  t.priority === 2 ? 'var(--color-accent-gold)' :
                                  t.priority === 3 ? 'var(--color-accent-primary)' :
                                  'var(--color-text-muted)'
                              }}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <h5 className="font-bold text-xs text-text-primary leading-tight">{t.title}</h5>
                                <button
                                  onClick={() => handleOpenEdit(t)}
                                  className="text-[10px] text-accent-primary font-bold hover:underline"
                                >
                                  Edit
                                </button>
                              </div>
                              {t.description && <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed">{t.description}</p>}
                              
                              <div className="flex items-center justify-between text-[9px] text-text-muted border-t border-white/5 pt-2 mt-1">
                                <span className="font-semibold">{t.project || 'General'}</span>
                                {t.dueDate && <span className="font-mono">{format(new Date(t.dueDate), 'MMM dd')}</span>}
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DndContext>
          )}
        </>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Log Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Export beta build files..."
            required
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add specific details or instructions..."
          />

          <div className="flex gap-4">
            <div className="w-1/2">
              <DatePicker label="Due Date" selectedDate={dueDate ? new Date(dueDate) : null} onChange={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')} />
            </div>
            <div className="w-1/2">
              <Dropdown
                label="Priority Level"
                options={[
                  { value: '1', label: 'P1 — Urgent' },
                  { value: '2', label: 'P2 — High' },
                  { value: '3', label: 'P3 — Medium' },
                  { value: '4', label: 'P4 — Normal' },
                ]}
                value={priority}
                onChange={setPriority}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-1/2">
              <Input
                label="Project Category"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Life Director"
              />
            </div>
            <div className="w-1/2">
              <Input
                label="Tags (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="design, dev, audit"
              />
            </div>
          </div>

          {/* Subtasks checklist */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Subtasks checklist</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Log a subtask item..."
                className="flex-1 py-1.5 px-3 glass-input text-xs"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSubtask}>
                Add Item
              </Button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {subtasks.map((st, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-white/[0.02] border border-white/5 rounded">
                    <span className="text-xs text-text-primary flex items-center gap-2">
                      <CheckSquare size={14} className="text-text-muted" />
                      {st.title}
                    </span>
                    <button type="button" onClick={() => handleRemoveSubtask(idx)} className="text-[10px] text-accent-warm hover:underline">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" variant="primary" className="w-full mt-6 py-2.5 font-bold">
            Log Task
          </Button>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Task Configuration">
        <form onSubmit={handleEditTaskSubmit} className="space-y-4">
          <Input
            label="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-4">
            <div className="w-1/2">
              <DatePicker label="Due Date" selectedDate={dueDate ? new Date(dueDate) : null} onChange={(d) => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')} />
            </div>
            <div className="w-1/2">
              <Dropdown
                label="Priority Level"
                options={[
                  { value: '1', label: 'P1 — Urgent' },
                  { value: '2', label: 'P2 — High' },
                  { value: '3', label: 'P3 — Medium' },
                  { value: '4', label: 'P4 — Normal' },
                ]}
                value={priority}
                onChange={setPriority}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-1/2">
              <Input
                label="Project Category"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              />
            </div>
            <div className="w-1/2">
              <Input
                label="Tags (comma-separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          {/* Subtask editing */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Subtasks checklist</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Log a subtask item..."
                className="flex-1 py-1.5 px-3 glass-input text-xs"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSubtask}>
                Add Item
              </Button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5">
                {subtasks.map((st, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-white/[0.02] border border-white/5 rounded">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
                      <input
                        type="checkbox"
                        checked={st.isDone}
                        onChange={() => {
                          const updated = [...subtasks];
                          updated[idx].isDone = !updated[idx].isDone;
                          setSubtasks(updated);
                        }}
                        className="rounded bg-white/5 border-white/10 text-accent-primary"
                      />
                      <span className={st.isDone ? 'line-through text-text-secondary' : ''}>{st.title}</span>
                    </label>
                    <button type="button" onClick={() => handleRemoveSubtask(idx)} className="text-[10px] text-accent-warm hover:underline">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 border-t border-white/10 pt-4 mt-6">
            <Button type="submit" variant="primary" className="flex-1 py-2.5 font-bold">
              Save Configuration
            </Button>
            <Button
              type="button"
              variant="danger"
              className="py-2.5 px-4 font-bold"
              onClick={() => handleDeleteTask(selectedTask.id)}
            >
              Delete
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
