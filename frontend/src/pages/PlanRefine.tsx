import React, { useEffect, useRef, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToast,
  IonToolbar,
  IonCard,
  IonCardContent,
} from '@ionic/react';
import { checkmark, send, sparkles } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { chatApi, workoutPlanApi } from '../services/api_backend';
import { useUpdateActivePlan } from '../hooks/useActivePlan';

/**
 * Step 7 of the plan-creation wizard — post-generate conversational
 * refinement. Loads the plan that the wizard just created (or any plan,
 * since the route accepts any planId), shows it as context, and lets the
 * user chat with the AI coach to tweak it before committing.
 *
 * The chat reuses the existing /api/chat path with chatHistory + the
 * active plan injected server-side (since this plan was just activated
 * by the generate endpoint). When the AI emits a complete revised plan,
 * an "Apply Changes" CTA writes it back via the regular PUT /api/plans.
 *
 * "Looks good — go to Today" exits to /today.
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PlanRefine: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const history = useHistory();
  const user = useStore((s) => s.user);
  const { invalidateActivePlan } = useUpdateActivePlan();

  const [plan, setPlan] = useState<any | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [suggestedPlanText, setSuggestedPlanText] = useState<string | null>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);

  // Load the plan once, so we can show its current name + summary.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let cancelled = false;
    (async () => {
      setLoadingPlan(true);
      try {
        const plans = await workoutPlanApi.getUserPlans(uid);
        const found = plans.find((p: any) => String(p.id) === String(planId));
        if (!cancelled) setPlan(found || null);
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, planId]);

  useEffect(() => {
    contentRef.current?.scrollToBottom(300);
  }, [messages, suggestedPlanText]);

  const handleSend = async () => {
    if (!input.trim() || !user?.id || sending) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const response = await chatApi.sendMessage(
        user.id,
        userMsg.content,
        [...messages, userMsg],
        `plan-refine-${planId}`
      );
      const assistantMsg: ChatMessage = { role: 'assistant', content: response.message };
      setMessages((prev) => [...prev, assistantMsg]);
      // If the AI emitted a complete plan (Apply Changes signal), capture it.
      if (response.message.includes('Day 1') && /\bApply Changes\b/i.test(response.message)) {
        setSuggestedPlanText(response.message);
      }
    } catch (err: any) {
      setToast(err?.response?.data?.error || err?.message || 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  const handleApply = async () => {
    if (!suggestedPlanText || !plan?.id) return;
    setApplying(true);
    try {
      // Extract just the plan text — strip prelude/closing prose around the days.
      const headerIdx = suggestedPlanText.search(/^\*{0,2}Day\s+1\b/im);
      const cleaned = (headerIdx >= 0 ? suggestedPlanText.slice(headerIdx) : suggestedPlanText)
        .replace(/^.*Apply Changes.*$/im, '')
        .trim();
      await workoutPlanApi.updatePlan(Number(plan.id), { planDetails: cleaned });
      invalidateActivePlan();
      setToast('Plan updated.');
      setSuggestedPlanText(null);
    } catch (err: any) {
      setToast(err?.response?.data?.error || 'Apply failed.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{plan?.name ? `Refine: ${plan.name}` : 'Refine plan'}</IonTitle>
          <IonButtons slot="end">
            <IonButton color="success" onClick={() => history.push('/today')}>
              <IonIcon icon={checkmark} slot="start" />
              Looks good
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef}>
        {loadingPlan ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <IonSpinner />
          </div>
        ) : !plan ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p>Couldn't load the plan. Try going back to Today.</p>
            <IonButton onClick={() => history.push('/today')}>Back to Today</IonButton>
          </div>
        ) : (
          <>
            <IonCard color="light" style={{ margin: 12 }}>
              <IonCardContent>
                <strong>Your plan is ready.</strong>
                <p style={{ margin: '6px 0', fontSize: 14 }}>
                  Anything you'd like to adjust before we commit? Tap a suggestion or type your own.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {[
                    'Swap deadlifts for hip thrusts',
                    'Make Day 3 shorter',
                    'Lower the pull-up volume',
                    'Add more core work',
                  ].map((s) => (
                    <IonButton
                      key={s}
                      size="small"
                      fill="outline"
                      onClick={() => setInput(s)}
                      disabled={sending}
                    >
                      {s}
                    </IonButton>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>

            <IonList style={{ padding: 12 }}>
              {messages.map((m, idx) => (
                <IonItem key={idx} lines="none" style={{ '--padding-start': 0 } as any}>
                  <div
                    style={{
                      maxWidth: '85%',
                      marginLeft: m.role === 'user' ? 'auto' : 0,
                      background: m.role === 'user' ? 'var(--ion-color-primary)' : '#eef0f3',
                      color: m.role === 'user' ? '#fff' : '#222',
                      padding: '10px 12px',
                      borderRadius: 14,
                      whiteSpace: 'pre-wrap',
                      fontSize: 14,
                    }}
                  >
                    {m.role === 'assistant' && (
                      <IonIcon icon={sparkles} style={{ marginRight: 6, opacity: 0.7 }} />
                    )}
                    {m.content}
                  </div>
                </IonItem>
              ))}
              {sending && (
                <IonItem lines="none">
                  <IonSpinner name="dots" />
                  <IonLabel style={{ marginLeft: 8, color: '#666' }}>thinking…</IonLabel>
                </IonItem>
              )}
              {suggestedPlanText && (
                <IonCard color="success" style={{ marginTop: 8 }}>
                  <IonCardContent>
                    <strong>Apply these changes?</strong>
                    <p style={{ margin: '6px 0 10px', fontSize: 13 }}>
                      The AI proposed a revised plan above. Apply Changes will overwrite the current
                      plan with the new one.
                    </p>
                    <IonButton expand="block" onClick={handleApply} disabled={applying}>
                      {applying ? <IonSpinner name="dots" /> : 'Apply Changes to my plan'}
                    </IonButton>
                  </IonCardContent>
                </IonCard>
              )}
            </IonList>
          </>
        )}

        <IonToast
          isOpen={!!toast}
          onDidDismiss={() => setToast(null)}
          message={toast || ''}
          duration={2500}
          position="top"
        />
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div style={{ display: 'flex', gap: 8, padding: 8 }}>
            <IonInput
              value={input}
              onIonInput={(e) => setInput(e.detail.value || '')}
              placeholder="Type a change request…"
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              style={{ flex: 1 }}
            />
            <IonButton onClick={handleSend} disabled={!input.trim() || sending}>
              <IonIcon icon={send} slot="icon-only" />
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default PlanRefine;
