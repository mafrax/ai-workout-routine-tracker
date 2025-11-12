import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
} from '@ionic/react';
import { notifications } from 'ionicons/icons';
import { useFastingStore } from '../store/useFastingStore';
import TimerButton from '../components/Fasting/TimerButton';
import PresetSelector from '../components/Fasting/PresetSelector';
import StopFastModal from '../components/Fasting/StopFastModal';
import QuickStats from '../components/Fasting/QuickStats';
import PresetModal from '../components/Fasting/PresetModal';
import NotificationSettings from '../components/Fasting/NotificationSettings';
import './Fasting.css';

const Fasting: React.FC = () => {
  const {
    loadPresets,
    loadActiveState,
    loadStats,
    loadNotificationSettings,
    startNotificationScheduler,
    activeSession,
    activeEatingWindow,
    timerState,
    stats,
    stopFast,
  } = useFastingStore();

  const [showStopModal, setShowStopModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    loadPresets();
    loadActiveState();
    loadStats();
    loadNotificationSettings();
    startNotificationScheduler();
  }, []);

  const handleStopClick = () => {
    setShowStopModal(true);
  };

  const handleStopConfirm = () => {
    stopFast();
    setShowStopModal(false);
  };

  const handleRefresh = (event: CustomEvent) => {
    loadStats();
    event.detail.complete();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Fasting</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowSettingsModal(true)}>
              <IonIcon slot="icon-only" icon={notifications} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="fasting-container">
          <PresetSelector
            onAddPreset={() => setShowPresetModal(true)}
            disabled={timerState !== 'eating' || !!activeEatingWindow}
          />

          <TimerButton onStop={handleStopClick} />

          <QuickStats stats={stats} />
        </div>

        <StopFastModal
          isOpen={showStopModal}
          activeSession={activeSession}
          onConfirm={handleStopConfirm}
          onCancel={() => setShowStopModal(false)}
        />

        <PresetModal
          isOpen={showPresetModal}
          onClose={() => setShowPresetModal(false)}
        />

        <IonModal isOpen={showSettingsModal} onDidDismiss={() => setShowSettingsModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Notification Settings</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowSettingsModal(false)}>Close</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <NotificationSettings />
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Fasting;
