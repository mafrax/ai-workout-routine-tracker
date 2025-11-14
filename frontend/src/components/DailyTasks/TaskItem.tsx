import React from 'react';
import {
  IonItem,
  IonLabel,
  IonCheckbox,
  IonBadge,
  IonIcon,
  IonItemSliding,
  IonItemOptions,
  IonItemOption
} from '@ionic/react';
import { flameOutline, trash } from 'ionicons/icons';
import { DailyTask } from '../../types/dailyTasks';
import './TaskItem.css';

interface TaskItemProps {
  task: DailyTask;
  onToggle: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onClick?: (taskId: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onClick }) => {
  const handleCheckboxChange = (e: CustomEvent) => {
    e.stopPropagation();
    onToggle(task.id);
  };

  const handleItemClick = () => {
    if (onClick) {
      onClick(task.id);
    }
  };

  const handleDelete = () => {
    onDelete(task.id);
  };

  return (
    <IonItemSliding>
      <IonItem
        button
        onClick={handleItemClick}
        className="task-item"
        detail={false}
      >
        <IonCheckbox
          slot="start"
          checked={task.completed}
          onIonChange={handleCheckboxChange}
          className="task-checkbox"
        />
        <IonLabel className={task.completed ? 'task-completed' : ''}>
          <h2>{task.title}</h2>
          {task.currentStreak > 0 && (
            <p className="task-streak-text">
              {task.currentStreak} day streak
            </p>
          )}
        </IonLabel>
        {task.currentStreak > 0 && (
          <IonBadge
            slot="end"
            color="warning"
            className="task-streak-badge"
          >
            <IonIcon icon={flameOutline} className="streak-icon" />
            {task.currentStreak}
          </IonBadge>
        )}
      </IonItem>

      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={handleDelete}>
          <IonIcon slot="icon-only" icon={trash} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
};

export default TaskItem;
