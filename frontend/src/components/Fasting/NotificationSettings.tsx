import React from 'react';
import {
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonListHeader,
  IonNote,
} from '@ionic/react';
import { useFastingStore } from '../../store/useFastingStore';
import './NotificationSettings.css';

const NotificationSettings: React.FC = () => {
  const { notificationSettings, updateNotificationSettings } = useFastingStore();

  const handleToggle = (path: string[], value: boolean) => {
    const newSettings = { ...notificationSettings };
    let current: any = newSettings;

    // Navigate to the nested property
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    // Set the value
    current[path[path.length - 1]] = value;

    updateNotificationSettings(newSettings);
  };

  return (
    <div className="notification-settings">
      <IonList>
        {/* Master Switch */}
        <IonListHeader>
          <IonLabel>Notifications</IonLabel>
        </IonListHeader>
        <IonItem>
          <IonLabel>
            <h2>Enable Notifications</h2>
            <p>Master switch for all notifications</p>
          </IonLabel>
          <IonToggle
            checked={notificationSettings.enabled}
            onIonChange={(e) => handleToggle(['enabled'], e.detail.checked)}
          />
        </IonItem>

        {/* Notification Channels */}
        {notificationSettings.enabled && (
          <>
            <IonListHeader>
              <IonLabel>Channels</IonLabel>
            </IonListHeader>
            <IonItem>
              <IonLabel>
                <h2>Local Notifications</h2>
                <p>On-device notifications</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.localNotifications}
                onIonChange={(e) => handleToggle(['localNotifications'], e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h2>Telegram Notifications</h2>
                <p>Send via Telegram bot</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.telegramNotifications}
                onIonChange={(e) => handleToggle(['telegramNotifications'], e.detail.checked)}
              />
            </IonItem>

            {/* Eating Window Reminders */}
            <IonListHeader>
              <IonLabel>Eating Window Reminders</IonLabel>
            </IonListHeader>
            <IonItem>
              <IonLabel>
                <h2>2 Hours Before</h2>
                <p>Remind when 2h left in eating window</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.eatingWindowReminders.twoHours}
                onIonChange={(e) => handleToggle(['eatingWindowReminders', 'twoHours'], e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h2>1 Hour Before</h2>
                <p>Remind when 1h left in eating window</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.eatingWindowReminders.oneHour}
                onIonChange={(e) => handleToggle(['eatingWindowReminders', 'oneHour'], e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h2>30 Minutes Before</h2>
                <p>Remind when 30min left in eating window</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.eatingWindowReminders.thirtyMinutes}
                onIonChange={(e) => handleToggle(['eatingWindowReminders', 'thirtyMinutes'], e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h2>Window Ending</h2>
                <p>Notify when eating window ends</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.eatingWindowReminders.windowEnding}
                onIonChange={(e) => handleToggle(['eatingWindowReminders', 'windowEnding'], e.detail.checked)}
              />
            </IonItem>

            {/* Overdue Reminders */}
            <IonListHeader>
              <IonLabel>Overdue Reminders</IonLabel>
              <IonNote>When you haven't started fasting yet</IonNote>
            </IonListHeader>
            <IonItem>
              <IonLabel>
                <h2>15 Minutes Overdue</h2>
                <p>Gentle reminder after eating window</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.overdueReminders.fifteenMinutes}
                onIonChange={(e) => handleToggle(['overdueReminders', 'fifteenMinutes'], e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h2>30 Minutes Overdue</h2>
                <p>Moderate urgency reminder</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.overdueReminders.thirtyMinutes}
                onIonChange={(e) => handleToggle(['overdueReminders', 'thirtyMinutes'], e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h2>1 Hour Overdue</h2>
                <p>High urgency reminder</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.overdueReminders.oneHour}
                onIonChange={(e) => handleToggle(['overdueReminders', 'oneHour'], e.detail.checked)}
              />
            </IonItem>

            {/* Fasting Milestones */}
            <IonListHeader>
              <IonLabel>Fasting Milestones</IonLabel>
            </IonListHeader>
            <IonItem>
              <IonLabel>
                <h2>Goal Reached</h2>
                <p>Celebrate when you reach your fasting goal</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.fastingMilestones.goalReached}
                onIonChange={(e) => handleToggle(['fastingMilestones', 'goalReached'], e.detail.checked)}
              />
            </IonItem>
            <IonItem>
              <IonLabel>
                <h2>2 Hours Extra</h2>
                <p>Notify when fasting 2h beyond goal</p>
              </IonLabel>
              <IonToggle
                checked={notificationSettings.fastingMilestones.twoHoursExtra}
                onIonChange={(e) => handleToggle(['fastingMilestones', 'twoHoursExtra'], e.detail.checked)}
              />
            </IonItem>
          </>
        )}
      </IonList>
    </div>
  );
};

export default NotificationSettings;
