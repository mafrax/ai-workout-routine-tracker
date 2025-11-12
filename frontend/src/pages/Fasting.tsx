import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { useFastingStore } from '../store/useFastingStore';
import TimerButton from '../components/Fasting/TimerButton';
import PresetSelector from '../components/Fasting/PresetSelector';
import StopFastModal from '../components/Fasting/StopFastModal';
import QuickStats from '../components/Fasting/QuickStats';
import PresetModal from '../components/Fasting/PresetModal';
import './Fasting.css';

const Fasting: React.FC = () => {
  const {
    loadPresets,
    loadActiveState,
    loadStats,
    activeSession,
    activeEatingWindow,
    timerState,
    stats,
    stopFast,
  } = useFastingStore();

  const [showStopModal, setShowStopModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);

  useEffect(() => {
    loadPresets();
    loadActiveState();
    loadStats();
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
      </IonContent>
    </IonPage>
  );
};

export default Fasting;
