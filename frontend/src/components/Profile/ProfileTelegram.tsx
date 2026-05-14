import React, { useEffect, useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { checkmarkCircle, closeCircle, logoWhatsapp, send } from 'ionicons/icons';
import { telegramService } from '../../services/telegramService';
import { dailyRecapService } from '../../services/dailyRecapService';

interface Props {
  userId: number;
  onToast: (message: string) => void;
}

/**
 * Telegram notifications setup card + modal. Self-contained:
 * - Loads its own credentials from the backend (and Preferences as fallback)
 * - Owns its modal state
 * - Reports success/error toasts via `onToast` so the parent doesn't need to
 *   know anything about Telegram internals.
 */
const ProfileTelegram: React.FC<Props> = ({ userId, onToast }) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingRecap, setSendingRecap] = useState(false);

  useEffect(() => {
    if (!userId) return;
    loadConfig();
  }, [userId]);

  const loadConfig = async () => {
    try {
      const { telegramConfigApi } = await import('../../services/api_backend');
      const config = await telegramConfigApi.get(userId);
      if (config.botToken && config.chatId) {
        setBotToken(config.botToken);
        setChatId(config.chatId);
        // Mirror to Preferences so the offline telegramService picks it up.
        await Preferences.set({ key: 'telegram_bot_token', value: config.botToken });
        await Preferences.set({ key: 'telegram_chat_id', value: config.chatId });
        await telegramService.loadConfig();
        if (telegramService.isConfigured()) {
          await dailyRecapService.setupDailyNotification();
        }
      }
    } catch (error) {
      console.error('Error loading telegram config:', error);
      await telegramService.loadConfig();
      const tokenPref = await Preferences.get({ key: 'telegram_bot_token' });
      const chatIdPref = await Preferences.get({ key: 'telegram_chat_id' });
      if (tokenPref.value) setBotToken(tokenPref.value);
      if (chatIdPref.value) setChatId(chatIdPref.value);
    }
  };

  const handleSave = async () => {
    if (!userId || !botToken || !chatId) {
      onToast('Please fill in both Bot Token and Chat ID');
      return;
    }
    try {
      const { telegramConfigApi } = await import('../../services/api_backend');
      await telegramConfigApi.save(userId, { botToken, chatId });
      await telegramService.saveConfig(botToken, chatId);
      setShowModal(false);
      onToast('Telegram settings saved!');
    } catch (error) {
      console.error('Error saving telegram config:', error);
      onToast('Failed to save Telegram settings');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await telegramService.testConnection();
    if (result.success) {
      await telegramService.sendMessage(
        '🎉 Telegram integration is working! You will receive workout notifications here.'
      );
      onToast('Test successful! Check your Telegram');
    } else {
      onToast(`Test failed: ${result.error}`);
    }
    setTesting(false);
  };

  const handleSendDailyRecap = async () => {
    if (!userId) return;
    setSendingRecap(true);
    const success = await dailyRecapService.sendDailyRecap(userId);
    onToast(success ? 'Daily recap sent! Check your Telegram' : 'Failed to send recap');
    setSendingRecap(false);
  };

  return (
    <>
      <IonCard className="telegram-card">
        <IonCardContent>
          <h2 className="section-title">
            <IonIcon icon={send} /> Telegram Notifications
          </h2>
          <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
            Get workout completion notifications sent to your Telegram
          </p>

          {telegramService.isConfigured() ? (
            <div>
              <IonChip color="success">
                <IonIcon icon={checkmarkCircle} />
                <IonLabel>Connected</IonLabel>
              </IonChip>
              <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '12px' }}>
                📅 Daily recap scheduled for 9:00 AM
              </p>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <IonButton expand="block" onClick={handleSendDailyRecap} disabled={sendingRecap}>
                  <IonIcon icon={send} slot="start" />
                  {sendingRecap ? 'Sending...' : 'Send Daily Recap Now'}
                </IonButton>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <IonButton size="small" fill="outline" onClick={() => setShowModal(true)} style={{ flex: 1 }}>
                    Reconfigure
                  </IonButton>
                  <IonButton size="small" fill="outline" onClick={handleTest} disabled={testing} style={{ flex: 1 }}>
                    {testing ? 'Testing...' : 'Test'}
                  </IonButton>
                </div>
              </div>
            </div>
          ) : (
            <IonButton expand="block" onClick={() => setShowModal(true)}>
              <IonIcon icon={logoWhatsapp} slot="start" />
              Setup Telegram
            </IonButton>
          )}
        </IonCardContent>
      </IonCard>

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Setup Telegram</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowModal(false)}>
                <IonIcon icon={closeCircle} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ padding: '20px' }}>
            <IonCard>
              <IonCardContent>
                <h3 style={{ marginTop: 0 }}>📱 How to setup:</h3>
                <ol style={{ lineHeight: '1.8', fontSize: '14px' }}>
                  <li>Open Telegram and search for <strong>@BotFather</strong></li>
                  <li>Send <code>/newbot</code> and follow instructions to create your bot</li>
                  <li>Copy the <strong>Bot Token</strong> (looks like: 123456:ABC-DEF1234...)</li>
                  <li>Search for <strong>@userinfobot</strong> in Telegram</li>
                  <li>Start a chat with it to get your <strong>Chat ID</strong> (a number)</li>
                  <li>Paste both values below</li>
                </ol>
              </IonCardContent>
            </IonCard>

            <IonList>
              <IonItem>
                <IonLabel position="stacked">Bot Token</IonLabel>
                <IonInput
                  value={botToken}
                  onIonInput={(e) => setBotToken(e.detail.value!)}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Chat ID</IonLabel>
                <IonInput
                  value={chatId}
                  onIonInput={(e) => setChatId(e.detail.value!)}
                  placeholder="123456789"
                  type="number"
                />
              </IonItem>
            </IonList>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <IonButton expand="block" onClick={handleSave} style={{ flex: 1 }}>
                Save
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                onClick={handleTest}
                disabled={testing || !botToken || !chatId}
                style={{ flex: 1 }}
              >
                {testing ? 'Testing...' : 'Test'}
              </IonButton>
            </div>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};

export default ProfileTelegram;
