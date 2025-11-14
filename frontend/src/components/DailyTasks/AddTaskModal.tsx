import React, { useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput
} from '@ionic/react';
import './AddTaskModal.css';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
      onClose();
    }
  };

  const handleCancel = () => {
    setTitle('');
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleCancel}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Add New Task</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleCancel}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="add-task-modal-content">
          <IonItem>
            <IonLabel position="stacked">Task Title</IonLabel>
            <IonInput
              value={title}
              placeholder="Enter task name..."
              onIonInput={(e) => setTitle(e.detail.value || '')}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                }
              }}
              autoFocus
            />
          </IonItem>

          <IonButton
            expand="block"
            onClick={handleAdd}
            disabled={!title.trim()}
            className="add-task-button"
          >
            Add Task
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default AddTaskModal;
