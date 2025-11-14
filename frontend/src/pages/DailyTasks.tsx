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
import './DailyTasks.css';

const DailyTasks: React.FC = () => {
  const { user } = useStore();
  const {
    tasks,
    stats,
    isLoading,
    error,
    viewMode,
    setViewMode,
    loadTasks,
    loadStats,
    loadHistory,
    refresh,
    addTask,
    toggleTask,
    deleteTask,
    getCalendarDays,
    getWeekData
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
