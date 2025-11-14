import React from 'react';
import { IonList } from '@ionic/react';
import { DailyTask } from '../../types/dailyTasks';
import TaskItem from './TaskItem';
import EmptyState from './EmptyState';
import './TaskList.css';

interface TaskListProps {
  tasks: DailyTask[];
  onToggle: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onTaskClick?: (taskId: number) => void;
  emptyMessage?: string;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggle,
  onDelete,
  onTaskClick,
  emptyMessage = 'No tasks yet. Add your first task!'
}) => {
  if (tasks.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <IonList className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onClick={onTaskClick}
        />
      ))}
    </IonList>
  );
};

export default TaskList;
