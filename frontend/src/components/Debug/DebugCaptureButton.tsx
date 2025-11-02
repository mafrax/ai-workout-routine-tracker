import React, { useState } from 'react';
import { IonFab, IonFabButton, IonIcon, IonToast } from '@ionic/react';
import { camera, close } from 'ionicons/icons';
import { debugCapture } from '../../utils/debugCapture';
import './DebugCaptureButton.css';

const DebugCaptureButton: React.FC = () => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    try {
      setIsCapturing(true);
      const result = await debugCapture.capture();
      setToastMessage(result);
      setShowToast(true);
    } catch (error) {
      setToastMessage(`❌ Capture failed: ${error}`);
      setShowToast(true);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      <IonFab vertical="bottom" horizontal="end" slot="fixed" className="debug-capture-fab">
        <IonFabButton
          color="dark"
          size="small"
          onClick={handleCapture}
          disabled={isCapturing}
        >
          <IonIcon icon={isCapturing ? close : camera} />
        </IonFabButton>
      </IonFab>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={5000}
        position="top"
        color="dark"
        buttons={[
          {
            text: 'OK',
            role: 'cancel',
          },
        ]}
      />
    </>
  );
};

export default DebugCaptureButton;
