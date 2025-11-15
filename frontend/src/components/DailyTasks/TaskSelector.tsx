import React from 'react';
import { IonCard, IonCardContent, IonSelect, IonSelectOption, IonLabel } from '@ionic/react';
import { DailyTask } from '../../types/dailyTasks';
import './TaskSelector.css';

interface TaskSelectorProps {
  tasks: DailyTask[];
  selectedTaskId: number | null;
  onTaskSelect: (taskId: number | null) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({
  tasks,
  selectedTaskId,
  onTaskSelect
}) => {
  return (
    <IonCard className="task-selector-card">
      <IonCardContent>
        <IonLabel className="task-selector-label">Select Task</IonLabel>
        <IonSelect
          value={selectedTaskId}
          placeholder="Choose a task to view stats"
          onIonChange={(e) => onTaskSelect(e.detail.value)}
          interface="action-sheet"
          className="task-selector"
        >
          {tasks.map((task) => (
            <IonSelectOption key={task.id} value={task.id}>
              {task.title}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonCardContent>
    </IonCard>
  );
};

export default TaskSelector;
