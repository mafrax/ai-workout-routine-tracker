import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonChip,
  IonLabel,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import { close, camera, sparkles, checkmark } from 'ionicons/icons';
import {
  capturePhoto,
  analyzePhoto,
  type CapturedPhoto,
  type EquipmentAnalysisResult,
} from '../../services/equipmentVisionService';

type Stage = 'idle' | 'analyzing' | 'review' | 'error';

interface Props {
  isOpen: boolean;
  /** Equipment currently on the user's profile — pre-selected & deduped against suggestions. */
  existingEquipment: string[];
  /** Called when user confirms a final equipment list. The list is the items they kept selected. */
  onConfirm: (equipment: string[]) => void;
  onClose: () => void;
}

/**
 * Take/upload a photo, run it through the backend vision endpoint, and let
 * the user accept or reject each detected item via chips before confirming.
 *
 * Self-contained — no parent state needed beyond `isOpen` and the callbacks.
 */
const EquipmentPhotoCapture: React.FC<Props> = ({ isOpen, existingEquipment, onConfirm, onClose }) => {
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [result, setResult] = useState<EquipmentAnalysisResult | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Items currently selected — starts as the full detected list, user can toggle off.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const reset = () => {
    setPhoto(null);
    setResult(null);
    setStage('idle');
    setErrorMessage(null);
    setSelected(new Set());
  };

  const handleStart = async () => {
    try {
      reset();
      const captured = await capturePhoto();
      if (!captured) return; // user cancelled
      setPhoto(captured);
      setStage('analyzing');
      const r = await analyzePhoto(captured);
      if (!r.ok) {
        setStage('error');
        setErrorMessage(
          r.error.kind === 'unreadable'
            ? "Couldn't read this photo. Try a clearer shot."
            : 'Network error. Check your connection and try again.'
        );
        return;
      }
      setResult(r.data);
      // Pre-select items that aren't already in the user's equipment list.
      const lowerExisting = new Set(existingEquipment.map((e) => e.toLowerCase()));
      const fresh = r.data.equipment.filter((e) => !lowerExisting.has(e.toLowerCase()));
      setSelected(new Set(fresh));
      setStage('review');
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err?.message || 'Unable to access camera');
    }
  };

  const toggle = (item: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const handleConfirm = () => {
    // Merge selected new items with the user's existing equipment (case-insensitive dedupe).
    const merged: string[] = [...existingEquipment];
    const lowerMerged = new Set(merged.map((e) => e.toLowerCase()));
    for (const item of selected) {
      if (!lowerMerged.has(item.toLowerCase())) {
        merged.push(item);
        lowerMerged.add(item.toLowerCase());
      }
    }
    onConfirm(merged);
    reset();
  };

  const handleDismiss = () => {
    reset();
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Detect equipment from photo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleDismiss} aria-label="Close">
              <IonIcon slot="icon-only" icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {stage === 'idle' && !photo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
            <p style={{ margin: 0 }}>
              Snap a photo of your workout area (or upload one) and the AI coach will list the
              equipment it sees. You'll be able to review what gets added before saving.
            </p>
            <IonButton expand="block" onClick={handleStart}>
              <IonIcon icon={camera} slot="start" />
              Take or choose a photo
            </IonButton>
          </div>
        )}

        {photo && stage === 'analyzing' && (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <img
              src={photo.dataUrl}
              alt="Equipment"
              style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 16 }}
            />
            <IonSpinner name="dots" />
            <p>Analysing photo…</p>
          </div>
        )}

        {photo && stage === 'review' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <img
              src={photo.dataUrl}
              alt="Equipment"
              style={{ maxWidth: '100%', borderRadius: 12 }}
            />
            <div>
              <strong>
                <IonIcon icon={sparkles} /> Found {result.equipment.length} item
                {result.equipment.length === 1 ? '' : 's'}
              </strong>
              {result.confidence === 'low' && (
                <p style={{ margin: '4px 0', color: 'var(--ion-color-warning)' }}>
                  Confidence is low — review carefully.
                </p>
              )}
              {result.notes && <p style={{ margin: '4px 0', color: '#666' }}>{result.notes}</p>}
            </div>
            {result.equipment.length === 0 ? (
              <p>No workout equipment detected. Try a different angle or add items manually.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.equipment.map((item) => {
                  const isOn = selected.has(item);
                  const alreadyOwned = existingEquipment
                    .map((e) => e.toLowerCase())
                    .includes(item.toLowerCase());
                  return (
                    <IonChip
                      key={item}
                      color={alreadyOwned ? 'medium' : isOn ? 'primary' : 'medium'}
                      outline={!isOn}
                      onClick={() => !alreadyOwned && toggle(item)}
                      style={{ cursor: alreadyOwned ? 'default' : 'pointer' }}
                    >
                      {isOn && !alreadyOwned && <IonIcon icon={checkmark} />}
                      <IonLabel>
                        {item}
                        {alreadyOwned && ' (already added)'}
                      </IonLabel>
                    </IonChip>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <IonButton fill="outline" onClick={handleStart}>
                Retake
              </IonButton>
              <IonButton expand="block" onClick={handleConfirm} disabled={selected.size === 0}>
                Add {selected.size > 0 ? `${selected.size} ` : ''}selected
              </IonButton>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <p style={{ color: 'var(--ion-color-danger)' }}>{errorMessage}</p>
            <IonButton onClick={handleStart}>Try again</IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default EquipmentPhotoCapture;
