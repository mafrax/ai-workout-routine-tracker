import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSegment,
  IonSegmentButton,
  IonToast,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail
} from '@ionic/react';
import { add, settings } from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { useDailyTasksStore } from '../store/useDailyTasksStore';
import TaskList from '../components/DailyTasks/TaskList';
import QuickStats from '../components/DailyTasks/QuickStats';
import Calendar from '../components/DailyTasks/Calendar';
import WeekChart from '../components/DailyTasks/WeekChart';
import AddTaskModal from '../components/DailyTasks/AddTaskModal';
import LoadingState from '../components/DailyTasks/LoadingState';
import ErrorState from '../components/DailyTasks/ErrorState';
import TaskSelector from '../components/DailyTasks/TaskSelector';
import PerTaskStats from '../components/DailyTasks/PerTaskStats';
import './DailyTasks.css';

const DailyTasks: React.FC = () => {
  const { user } = useStore();
  const {
    tasks,
    stats,
    selectedTaskId,
    isLoading,
    error,
    viewMode,
    setViewMode,
    setSelectedTask,
    loadTasks,
    loadStats,
    loadHistory,
    loadTaskCompletionDates,
    refresh,
    addTask,
    toggleTask,
    deleteTask,
    getCalendarDays,
    getWeekData,
    getTaskCompletionDates
  } = useDailyTasksStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user]);

  // Load completion dates when task is selected
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskCompletionDates(selectedTaskId);
    }
  }, [selectedTaskId]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadTasks(),
        loadStats(),
        loadHistory()
      ]);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    try {
      await refresh();
    } finally {
      event.detail.complete();
    }
  };

  const handleAddTask = async (title: string) => {
    try {
      await addTask(title);
      setToastMessage('Task added successfully!');
      setShowToast(true);
    } catch (err) {
      setToastMessage('Failed to add task');
      setShowToast(true);
    }
  };

  const handleToggleTask = async (taskId: number) => {
    try {
      await toggleTask(taskId);
    } catch (err) {
      setToastMessage('Failed to toggle task');
      setShowToast(true);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      setToastMessage('Task deleted');
      setShowToast(true);
    } catch (err) {
      setToastMessage('Failed to delete task');
      setShowToast(true);
    }
  };

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const handleDayClick = (day: any) => {
    // Future: Open day details modal
    console.log('Day clicked:', day);
  };

  // Get data for visualizations
  const calendarDays = getCalendarDays(currentYear, currentMonth);
  const weekData = getWeekData();

  // Filter tasks
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Get selected task
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Get per-task calendar and week data
  const perTaskCalendarDays = selectedTask ? getPerTaskCalendarDays(selectedTask, currentYear, currentMonth) : [];
  const perTaskWeekData = selectedTask ? getPerTaskWeekData(selectedTask) : [];

  // Helper function to generate calendar days for a specific task
  function getPerTaskCalendarDays(task: typeof selectedTask, year: number, month: number) {
    if (!task) return [];

    // Get completion dates from store
    const completionDates = getTaskCompletionDates(task.id);
    const completionDatesSet = new Set(completionDates);

    // Generate calendar structure
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = firstDay.getDay();
    const daysFromPrevMonth = firstDayOfWeek;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
    const daysFromNextMonth = totalCells - (daysInMonth + daysFromPrevMonth);

    const days: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Previous month days
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];
      const isCompleted = completionDatesSet.has(dateString);

      days.push({
        dateString,
        tasksCompleted: isCompleted ? 1 : 0,
        tasksTotal: 1,
        completionRate: isCompleted ? 100 : 0,
        hasAnyCompletion: isCompleted,
        isPerfect: isCompleted,
        isToday: dateString === today,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const isCompleted = completionDatesSet.has(dateString);

      days.push({
        dateString,
        tasksCompleted: isCompleted ? 1 : 0,
        tasksTotal: 1,
        completionRate: isCompleted ? 100 : 0,
        hasAnyCompletion: isCompleted,
        isPerfect: isCompleted,
        isToday: dateString === today,
        isCurrentMonth: true
      });
    }

    // Next month days
    for (let day = 1; day <= daysFromNextMonth; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = date.toISOString().split('T')[0];
      const isCompleted = completionDatesSet.has(dateString);

      days.push({
        dateString,
        tasksCompleted: isCompleted ? 1 : 0,
        tasksTotal: 1,
        completionRate: isCompleted ? 100 : 0,
        hasAnyCompletion: isCompleted,
        isPerfect: isCompleted,
        isToday: dateString === today,
        isCurrentMonth: false
      });
    }

    return days;
  }

  // Helper function to generate week data for a specific task
  function getPerTaskWeekData(task: typeof selectedTask) {
    if (!task) return [];

    // Get completion dates from store
    const completionDates = getTaskCompletionDates(task.id);
    const completionDatesSet = new Set(completionDates);

    const weekData: any[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];
      const isCompleted = completionDatesSet.has(dateString);

      weekData.push({
        date: dateString,
        dayName,
        tasksCompleted: isCompleted ? 1 : 0,
        tasksTotal: 1,
        completionRate: isCompleted ? 100 : 0
      });
    }

    return weekData;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Daily Tasks</IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/profile">
              <IonIcon icon={settings} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="daily-tasks-container">
          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <IonSegment
              value={viewMode}
              onIonChange={(e) => setViewMode(e.detail.value as 'aggregate' | 'per-task')}
            >
              <IonSegmentButton value="aggregate">
                <span>Overview</span>
              </IonSegmentButton>
              <IonSegmentButton value="per-task">
                <span>Per Task</span>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {/* Aggregate View */}
          {viewMode === 'aggregate' && (
            <>
              {/* Quick Stats */}
              <QuickStats stats={stats} isLoading={isLoading} />

              {/* Week Chart */}
              <WeekChart weekData={weekData} isLoading={isLoading} />

              {/* Calendar */}
              <Calendar
                calendarDays={calendarDays}
                currentMonth={currentMonth}
                currentYear={currentYear}
                onMonthChange={handleMonthChange}
                onDayClick={handleDayClick}
                isLoading={isLoading}
              />

              {/* Error State */}
              {error && (
                <ErrorState
                  message={error}
                  onRetry={loadInitialData}
                />
              )}

              {/* Task Lists */}
              {!error && (
                <>
                  <div className="task-section">
                    <h2 className="task-section-title">
                      To Do ({incompleteTasks.length})
                    </h2>
                    <TaskList
                      tasks={incompleteTasks}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      emptyMessage="All tasks completed! 🎉"
                    />
                  </div>

                  {completedTasks.length > 0 && (
                    <div className="task-section">
                      <h2 className="task-section-title">
                        Completed ({completedTasks.length})
                      </h2>
                      <TaskList
                        tasks={completedTasks}
                        onToggle={handleToggleTask}
                        onDelete={handleDeleteTask}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Per-Task View */}
          {viewMode === 'per-task' && (
            <>
              {/* Task Selector */}
              <TaskSelector
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onTaskSelect={setSelectedTask}
              />

              {/* Show stats if a task is selected */}
              {selectedTask && (
                <>
                  <PerTaskStats task={selectedTask} onToggleTask={handleToggleTask} />

                  {/* Week Chart for selected task */}
                  <WeekChart weekData={perTaskWeekData} isLoading={isLoading} />

                  {/* Calendar for selected task */}
                  <Calendar
                    calendarDays={perTaskCalendarDays}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    onMonthChange={handleMonthChange}
                    onDayClick={handleDayClick}
                    isLoading={isLoading}
                  />
                </>
              )}

              {/* Show message if no task selected */}
              {!selectedTask && tasks.length > 0 && (
                <ErrorState
                  message="Select a task to view its statistics"
                  onRetry={undefined}
                />
              )}

              {/* Show message if no tasks exist */}
              {tasks.length === 0 && (
                <ErrorState
                  message="No tasks yet. Add a task to get started!"
                  onRetry={undefined}
                />
              )}
            </>
          )}
        </div>

        {/* FAB Button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowAddModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Add Task Modal */}
        <AddTaskModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTask}
        />

        {/* Toast */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
};

export default DailyTasks;
