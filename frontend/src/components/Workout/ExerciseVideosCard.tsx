import React from 'react';
import { IonButton, IonCard, IonCardContent, IonIcon, IonSpinner } from '@ionic/react';
import { Browser } from '@capacitor/browser';
import { searchOutline } from 'ionicons/icons';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
}

interface Props {
  exerciseName: string;
  videos: Video[];
  loading: boolean;
  /** Triggered when the user taps "Load Videos" / "Refresh". */
  onLoad: (exerciseName: string) => void;
}

/**
 * YouTube video previews for the current exercise. Vertical 9:16 thumbnails;
 * tapping one opens the video inside the Capacitor in-app browser overlay
 * so the host webview is never backgrounded and workout state survives.
 */
const ExerciseVideosCard: React.FC<Props> = ({ exerciseName, videos, loading, onLoad }) => {
  return (
    <IonCard className="exercise-info-card">
      <IonCardContent>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a1a1a' }}>Exercise Videos</h3>
          <IonButton
            size="small"
            onClick={() => onLoad(exerciseName)}
            disabled={loading}
            fill="solid"
            color="primary"
          >
            <IonIcon icon={searchOutline} slot="start" />
            {videos.length > 0 ? 'Refresh' : 'Load Videos'}
          </IonButton>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <IonSpinner name="crescent" color="primary" />
            <p style={{ marginTop: '16px', color: '#667eea', fontSize: '15px', fontWeight: '500' }}>
              Searching for exercise videos...
            </p>
          </div>
        ) : videos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            {videos.map((video) => (
              <div
                key={video.id}
                style={{ width: '100%', maxWidth: '280px', cursor: 'pointer' }}
                onClick={() => {
                  Browser.open({ url: `https://www.youtube.com/watch?v=${video.id}` });
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    paddingBottom: '177.78%', // 9:16 aspect ratio for vertical video
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                    marginBottom: '12px',
                    backgroundColor: '#000',
                    backgroundImage: `url(${video.thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '60px',
                      height: '60px',
                      backgroundColor: 'rgba(255, 0, 0, 0.9)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '20px solid white',
                        borderTop: '12px solid transparent',
                        borderBottom: '12px solid transparent',
                        marginLeft: '4px',
                      }}
                    />
                  </div>
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    lineHeight: '1.3',
                    textAlign: 'center',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {video.title}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <IonIcon icon={searchOutline} style={{ fontSize: '48px', color: '#dee2e6', marginBottom: '16px' }} />
            <p style={{ color: '#6c757d', fontSize: '15px', lineHeight: '1.6', maxWidth: '300px', margin: '0 auto' }}>
              Tap "Load Videos" to watch exercise demonstration videos showing proper form and technique.
            </p>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default ExerciseVideosCard;
