import React, { useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { arrowBack, chevronBack, chevronForward } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { workoutPlanApi, type GeneratePlanPayload } from '../services/api_backend';
import { useUpdateActivePlan } from '../hooks/useActivePlan';
import FocusStep from '../components/PlanWizard/FocusStep';
import ScheduleStep from '../components/PlanWizard/ScheduleStep';
import EquipmentStep from '../components/PlanWizard/EquipmentStep';
import BodyweightStep from '../components/PlanWizard/BodyweightStep';
import ConstraintsStep from '../components/PlanWizard/ConstraintsStep';
import ReviewStep from '../components/PlanWizard/ReviewStep';
import { EMPTY_DRAFT, type PlanDraft } from '../components/PlanWizard/types';

const STEP_TITLES = ['Focus', 'Schedule', 'Equipment', 'Bodyweight', 'Constraints', 'Review'];

/**
 * Multi-step plan-creation wizard. Owns the draft state, gates step
 * progression on per-step validity, and on Review tap POSTs the typed
 * payload to /api/plans/generate.
 *
 * Step 7 (post-generate conversational refinement) lives in a separate
 * component mounted after success; this shell hands off control via
 * react-router navigation to `/plans/:id/refine` once the plan exists.
 * That route is wired in D.6.
 */
const NewPlanWizard: React.FC = () => {
  const history = useHistory();
  const user = useStore((s) => s.user);
  const { invalidateActivePlan } = useUpdateActivePlan();

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const totalSteps = STEP_TITLES.length;
  const progress = (stepIndex + 1) / totalSteps;

  // Each step exposes a boolean: can the user move forward yet?
  const stepValid = (() => {
    switch (stepIndex) {
      case 0:
        return draft.name.trim().length > 0 && !!draft.focus;
      case 1:
        return draft.daysPerWeek >= 2 && draft.durationWeeks >= 2;
      case 2:
      case 3:
        return true; // both equipment and bodyweight are optional
      case 4:
        return !!draft.intensity;
      default:
        return true;
    }
  })();

  const patchDraft = (patch: Partial<PlanDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const goNext = () => stepIndex < totalSteps - 1 && setStepIndex(stepIndex + 1);
  const goBack = () => {
    if (stepIndex === 0) history.goBack();
    else setStepIndex(stepIndex - 1);
  };

  const handleGenerate = async () => {
    if (!user?.id) {
      setToast('You need to be signed in to generate a plan.');
      return;
    }
    if (!draft.focus) {
      setToast('Pick a focus on Step 1 first.');
      return;
    }
    setGenerating(true);
    try {
      const payload: GeneratePlanPayload = {
        userId: user.id,
        name: draft.name.trim(),
        focus: draft.focus,
        daysPerWeek: draft.daysPerWeek,
        durationWeeks: draft.durationWeeks,
        equipment: draft.equipment,
        bodyweight: draft.bodyweight,
        injuries: draft.injuries.trim() || undefined,
        sessionMinutes: draft.sessionMinutes,
        intensity: draft.intensity,
        activate: true,
      };
      const result = await workoutPlanApi.generate(payload);
      invalidateActivePlan();
      // Pass the generated plan id forward; the refinement route reads it.
      history.push(`/plans/${result.plan.id}/refine`);
    } catch (err: any) {
      const serverMessage = err?.response?.data?.error || err?.message;
      setToast(serverMessage ? `Generation failed: ${serverMessage}` : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return <FocusStep draft={draft} onChange={patchDraft} />;
      case 1:
        return <ScheduleStep draft={draft} onChange={patchDraft} />;
      case 2:
        return <EquipmentStep draft={draft} onChange={patchDraft} />;
      case 3:
        return <BodyweightStep draft={draft} onChange={patchDraft} />;
      case 4:
        return <ConstraintsStep draft={draft} onChange={patchDraft} />;
      case 5:
        return <ReviewStep draft={draft} generating={generating} onGenerate={handleGenerate} />;
      default:
        return null;
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={goBack}>
              <IonIcon icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>{STEP_TITLES[stepIndex]}</IonTitle>
        </IonToolbar>
        <IonProgressBar value={progress} />
      </IonHeader>

      <IonContent>
        <div style={{ padding: '12px 0', paddingBottom: 100 }}>{renderStep()}</div>

        {/* Bottom navigation row — sticks to the bottom of the content area.
            The Review step has its own primary CTA, so we hide Next there. */}
        {stepIndex < totalSteps - 1 && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              background: 'var(--ion-background-color)',
              padding: 12,
              display: 'flex',
              gap: 8,
              borderTop: '1px solid #eee',
            }}
          >
            <IonButton fill="outline" onClick={goBack} disabled={stepIndex === 0}>
              <IonIcon icon={chevronBack} slot="start" />
              Back
            </IonButton>
            <IonButton expand="block" style={{ flex: 1 }} onClick={goNext} disabled={!stepValid}>
              Next
              <IonIcon icon={chevronForward} slot="end" />
            </IonButton>
          </div>
        )}

        <IonToast
          isOpen={!!toast}
          message={toast || ''}
          duration={2500}
          onDidDismiss={() => setToast(null)}
          position="top"
          color="warning"
        />
      </IonContent>
    </IonPage>
  );
};

export default NewPlanWizard;
