import React from 'react';
import { IonChip, IonIcon, IonButton } from '@ionic/react';
import { add } from 'ionicons/icons';
import { useFastingStore } from '../../store/useFastingStore';
import './PresetSelector.css';

interface PresetSelectorProps {
  onAddPreset: () => void;
  disabled?: boolean;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ onAddPreset, disabled = false }) => {
  const { presets, selectedPresetId, selectPreset } = useFastingStore();

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="preset-selector">
      <div className="preset-chips">
        {presets.map(preset => (
          <IonChip
            key={preset.id}
            color={selectedPresetId === preset.id ? 'primary' : 'medium'}
            onClick={() => !disabled && selectPreset(preset.id)}
            disabled={disabled}
            className="preset-chip"
          >
            {preset.name} ({formatDuration(preset.durationMinutes)})
          </IonChip>
        ))}
        <IonButton
          fill="outline"
          size="small"
          onClick={onAddPreset}
          disabled={disabled}
          className="add-preset-button"
        >
          <IonIcon icon={add} slot="start" />
          Add Preset
        </IonButton>
      </div>
    </div>
  );
};

export default PresetSelector;
