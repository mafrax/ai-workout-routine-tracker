import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonButton,
  IonInput,
  IonIcon,
  IonFab,
  IonFabButton,
  IonModal,
  IonButtons,
  IonToast,
} from '@ionic/react';
import { add, close, trashOutline, sendOutline, timeOutline, settings, send } from 'ionicons/icons';
import { useStore } from '../store/useStore';
import { telegramService } from '../services/telegramService';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { dailyTasksService, DailyTask } from '../services/dailyTasksService';
import './DailyTasks.css';

const DailyTasks: React.FC = () => {
  const { user } = useStore();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [startHour, setStartHour] = useState(9);
  const [reminderSchedule, setReminderSchedule] = useState<Date[]>([]);

  useEffect(() => {
    loadTasks();
    loadSettings();
    checkTelegramConfig();
    scheduleMidnightReset();
    setupNotifications();
  }, [user]);

  // App state listener removed - backend now handles scheduled reminders

  const loadTasks = async () => {
    const loadedTasks = await dailyTasksService.loadTasks(user?.id);
    setTasks(loadedTasks);
  };

  const loadSettings = () => {
    const storedStartHour = localStorage.getItem('dailyTasksStartHour');
    if (storedStartHour) {
      setStartHour(parseInt(storedStartHour));
    }
  };

  const saveSettings = (hour: number) => {
    localStorage.setItem('dailyTasksStartHour', hour.toString());
    setStartHour(hour);
    // Update reminder schedule display
    const schedule = generateReminderSchedule(hour);
    setReminderSchedule(schedule.map(h => {
      const time = new Date();
      time.setHours(h, 0, 0, 0);
      return time;
    }));
  };


  const checkTelegramConfig = async () => {
    await telegramService.loadConfig();
    const isConfigured = telegramService.isConfigured();
    setTelegramEnabled(isConfigured);

    if (isConfigured) {
      // Set up reminder schedule for display
      const schedule = generateReminderSchedule();
      setReminderSchedule(schedule.map(h => {
        const time = new Date();
        time.setHours(h, 0, 0, 0);
        return time;
      }));
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;

    const newTask = await dailyTasksService.addTask(newTaskTitle, user?.id);
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setNewTaskTitle('');
    setShowModal(false);
    // Reschedule notifications when tasks change
    scheduleNotifications();
  };

  const toggleTask = async (taskId: number) => {
    await dailyTasksService.toggleTask(taskId, user?.id);
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    // Reschedule notifications when tasks change
    scheduleNotifications();
  };

  const deleteTask = async (taskId: number) => {
    await dailyTasksService.deleteTask(taskId, user?.id);
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    // Reschedule notifications when tasks change
    scheduleNotifications();
  };

  const generateReminderSchedule = (startHourParam?: number): number[] => {
    const start = startHourParam ?? startHour;
    // Generate increasing frequency: start, +2h, +2h, +1h, +1h, +1h, +1h, +1h
    const schedule = [start];
    let currentHour = start;

    // First two reminders: every 2 hours
    currentHour += 2;
    if (currentHour <= 20) schedule.push(currentHour);
    currentHour += 2;
    if (currentHour <= 20) schedule.push(currentHour);

    // Remaining reminders: every 1 hour (increasing frequency)
    while (currentHour < 20) {
      currentHour += 1;
      schedule.push(currentHour);
    }

    return schedule;
  };

  const sendScheduledReminders = async () => {
    // This function will be called by the scheduled reminders
    // Note: In a production app, you'd want a backend service to handle scheduled messages
    const incompleteTasks = tasks.filter(t => !t.completed);
    if (incompleteTasks.length === 0) return;

    const currentHour = new Date().getHours();
    const userName = user?.name;

    // Generate AI-powered message with increasing pressure throughout the day
    const message = await telegramService.generatePersonalizedTaskReminder(
      incompleteTasks,
      currentHour,
      userName
    );

    await telegramService.sendMessage(message);
  };

  const scheduleMidnightReset = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Next midnight

    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      resetAllTasks();
      // Schedule the next midnight reset
      setInterval(resetAllTasks, 24 * 60 * 60 * 1000); // Every 24 hours
    }, msUntilMidnight);
  };

  const resetAllTasks = async () => {
    await dailyTasksService.resetAllTasks(user?.id);
    // Reload tasks from storage after reset
    await loadTasks();
    console.log(`✅ Reset tasks at midnight - unchecked all tasks`);
  };

  const setupNotifications = async () => {
    try {
      // Request permission
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      // Schedule notifications for the day
      await scheduleNotifications();
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const scheduleNotifications = async () => {
    try {
      // Cancel existing notifications
      const pending = await LocalNotifications.getPending();
      const taskNotificationIds = pending.notifications
        .filter(n => n.id >= 600 && n.id <= 2000)
        .map(n => ({ id: n.id }));

      if (taskNotificationIds.length > 0) {
        await LocalNotifications.cancel({ notifications: taskNotificationIds });
      }

      // Get incomplete tasks
      const storedTasks = localStorage.getItem('dailyTasks');
      if (!storedTasks) return;

      const currentTasks = JSON.parse(storedTasks);
      const incompleteTasks = currentTasks.filter((t: DailyTask) => !t.completed);

      if (incompleteTasks.length === 0) return;

      // Generate schedule
      const schedule = generateReminderSchedule();
      const notifications = [];

      for (let i = 0; i < schedule.length; i++) {
        const hour = schedule[i];
        const now = new Date();
        const notificationTime = new Date();
        notificationTime.setHours(hour, 0, 0, 0);

        // Skip if time has passed
        if (notificationTime <= now) continue;

        const taskList = incompleteTasks.map((t: DailyTask) => `• ${t.title}`).join('\n');
        const pressureEmoji = hour < 12 ? '💪' : hour < 15 ? '⚡' : hour < 18 ? '🔥' : '🚨';

        notifications.push({
          title: `${pressureEmoji} Daily Tasks Reminder`,
          body: `You have ${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's' : ''} to complete:\n${taskList}`,
          id: 600 + i,
          schedule: { at: notificationTime },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: null
        });
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        console.log(`✅ Scheduled ${notifications.length} notifications`);
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  };

  // Auto-reminder functionality removed - backend now handles scheduled reminders

  const sendReminderNow = async () => {
    const incompleteTasks = tasks.filter(t => !t.completed);
    if (incompleteTasks.length === 0) {
      setToastMessage('No incomplete tasks to remind about');
      setShowToast(true);
      return;
    }

    if (!telegramEnabled) {
      setToastMessage('Please configure Telegram in Settings first');
      setShowToast(true);
      setShowSettingsModal(true);
      return;
    }

    try {
      setToastMessage('Generating personalized message... 🤖');
      setShowToast(true);

      const currentHour = new Date().getHours();
      const userName = user?.name;

      // Generate AI-powered personalized message with pressure based on time of day
      const message = await telegramService.generatePersonalizedTaskReminder(
        incompleteTasks,
        currentHour,
        userName
      );

      const success = await telegramService.sendMessage(message);

      if (success) {
        setToastMessage(`AI message sent to Telegram! ✅ (${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's' : ''})`);
      } else {
        setToastMessage('Failed to send Telegram message');
      }
      setShowToast(true);
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      setToastMessage('Failed to send Telegram message');
      setShowToast(true);
    }
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const now = new Date();
  const upcomingReminders = reminderSchedule.filter(time => time > now);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Daily Tasks</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowSettingsModal(true)}>
              <IonIcon icon={settings} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="daily-tasks-container">
          {telegramEnabled && incompleteTasks.length > 0 && (
            <IonCard color="primary">
              <IonCardContent>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={send} style={{ fontSize: '20px' }} />
                    <strong>Telegram Reminders</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <IonButton size="small" fill="solid" color="light" onClick={sendReminderNow}>
                      <IonIcon icon={sendOutline} slot="start" />
                      Send Now
                    </IonButton>
                  </div>
                </div>
                {upcomingReminders.length > 0 ? (
                  <div style={{ fontSize: '14px' }}>
                    <p style={{ margin: '4px 0', opacity: 0.9 }}>
                      Next {upcomingReminders.length} reminder{upcomingReminders.length > 1 ? 's' : ''}:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {upcomingReminders.slice(0, 8).map((time, idx) => (
                        <IonButton key={idx} size="small" fill="outline" color="light" disabled>
                          {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </IonButton>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: '4px 0', fontSize: '14px', opacity: 0.9 }}>
                    No more reminders scheduled for today
                  </p>
                )}
              </IonCardContent>
            </IonCard>
          )}

          {tasks.length === 0 ? (
            <div className="empty-state">
              <h2>No Daily Tasks</h2>
              <p>Add tasks you want to complete every day</p>
            </div>
          ) : (
            <>
              {incompleteTasks.length > 0 && (
                <IonCard>
                  <IonCardContent>
                    <h3 className="task-section-title">
                      To Do ({incompleteTasks.length})
                    </h3>
                    <IonList>
                      {incompleteTasks.map(task => (
                        <IonItem key={task.id} lines="full">
                          <IonCheckbox
                            slot="start"
                            checked={task.completed}
                            onIonChange={() => toggleTask(task.id)}
                          />
                          <IonLabel>{task.title}</IonLabel>
                          <IonButton
                            slot="end"
                            fill="clear"
                            color="danger"
                            onClick={() => deleteTask(task.id)}
                          >
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </IonItem>
                      ))}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              )}

              {completedTasks.length > 0 && (
                <IonCard>
                  <IonCardContent>
                    <h3 className="task-section-title">
                      Completed ({completedTasks.length})
                    </h3>
                    <IonList>
                      {completedTasks.map(task => (
                        <IonItem key={task.id} lines="full" className="completed-task">
                          <IonCheckbox
                            slot="start"
                            checked={task.completed}
                            onIonChange={() => toggleTask(task.id)}
                          />
                          <IonLabel style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                            {task.title}
                          </IonLabel>
                          <IonButton
                            slot="end"
                            fill="clear"
                            color="danger"
                            onClick={() => deleteTask(task.id)}
                          >
                            <IonIcon icon={trashOutline} />
                          </IonButton>
                        </IonItem>
                      ))}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              )}
            </>
          )}

          {!telegramEnabled && tasks.length > 0 && (
            <IonCard color="warning">
              <IonCardContent>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <IonIcon icon={send} style={{ fontSize: '24px' }} />
                  <div>
                    <strong>Setup Telegram Reminders</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                      Get Telegram messages throughout the day to complete your tasks
                    </p>
                    <IonButton
                      size="small"
                      onClick={() => setShowSettingsModal(true)}
                      style={{ marginTop: '8px' }}
                    >
                      Configure Telegram
                    </IonButton>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Add Daily Task</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem>
              <IonLabel position="stacked">Task Title</IonLabel>
              <IonInput
                value={newTaskTitle}
                placeholder="e.g., Drink 8 glasses of water"
                onIonInput={(e) => setNewTaskTitle(e.detail.value || '')}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTask();
                  }
                }}
              />
            </IonItem>
            <IonButton
              expand="block"
              onClick={addTask}
              disabled={!newTaskTitle.trim()}
              style={{ marginTop: '20px' }}
            >
              Add Task
            </IonButton>
          </IonContent>
        </IonModal>

        <IonModal isOpen={showSettingsModal} onDidDismiss={() => setShowSettingsModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Telegram Reminder Settings</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowSettingsModal(false)}>
                  <IonIcon icon={close} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonCard color={telegramEnabled ? "success" : "warning"}>
              <IonCardContent>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <IonIcon icon={send} style={{ fontSize: '32px' }} />
                  <div>
                    <h3 style={{ margin: 0 }}>Telegram Status</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                      {telegramEnabled ? '✅ Connected' : '❌ Not configured'}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '14px', marginTop: '12px' }}>
                  {telegramEnabled
                    ? 'Telegram is configured! Messages will be sent to your Telegram according to the schedule below.'
                    : 'Configure Telegram in the Profile page to receive reminders. You need your Bot Token and Chat ID.'
                  }
                </p>
                {!telegramEnabled && (
                  <IonButton
                    expand="block"
                    routerLink="/profile"
                    style={{ marginTop: '12px' }}
                  >
                    Go to Profile to Configure
                  </IonButton>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <h3 style={{ marginBottom: '16px' }}>First Reminder Time</h3>
                <IonItem>
                  <IonLabel>Start Hour</IonLabel>
                  <IonInput
                    type="number"
                    value={startHour}
                    min={6}
                    max={20}
                    onIonInput={(e) => {
                      const value = parseInt(e.detail.value || '9');
                      if (value >= 6 && value <= 20) {
                        saveSettings(value);
                      }
                    }}
                  />
                </IonItem>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '12px' }}>
                  Choose when you want to receive your first reminder (6 AM - 8 PM)
                </p>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <h3 style={{ marginBottom: '12px' }}>Telegram Message Schedule</h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  Telegram messages will be sent at these times:
                </p>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>
                  📱 Local notifications scheduled automatically. 💬 Telegram reminders managed by backend.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {generateReminderSchedule().map((hour, idx) => {
                    const time = new Date();
                    time.setHours(hour, 0, 0, 0);
                    const isPast = time < new Date();

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: isPast ? '#f5f5f5' : '#e8f5e9',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: isPast ? 0.5 : 1,
                        }}
                      >
                        <span style={{ fontWeight: '500' }}>
                          {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {isPast ? 'Sent' : idx === 0 ? 'First reminder' : `Reminder ${idx + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                  Frequency increases throughout the day to help you stay on track
                </p>
              </IonCardContent>
            </IonCard>
          </IonContent>
        </IonModal>

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
