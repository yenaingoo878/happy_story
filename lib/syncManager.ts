type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type SyncProgress = {
  status: SyncStatus;
  progress: number; // 0-100
  total: number;
  completed: number;
};
type SyncListener = (state: SyncProgress) => void;

class SyncManager {
  private listener: SyncListener | null = null;
  private state: SyncProgress = {
    status: 'idle',
    progress: 0,
    total: 0,
    completed: 0,
  };

  subscribe(listener: SyncListener) {
    this.listener = listener;
    // Immediately notify with the current state
    this.listener(this.state);
  }

  unsubscribe() {
    this.listener = null;
  }
  
  private notify() {
    this.listener?.(this.state);
  }

  start(totalItems: number) {
    this.state = {
      status: 'syncing',
      progress: 0,
      total: totalItems,
      completed: 0,
    };
    this.notify();
  }

  itemCompleted() {
    if (this.state.status !== 'syncing') return;
    this.state.completed++;
    this.state.progress = this.state.total > 0 ? (this.state.completed / this.state.total) * 100 : 100;
    this.notify();
  }

  finish() {
    this.state.status = 'success';
    this.state.progress = 100;
    this.notify();

    // Reset after a delay
    setTimeout(() => {
        this.state.status = 'idle';
        this.state.progress = 0;
        this.state.total = 0;
        this.state.completed = 0;
        this.notify();
    }, 2500); 
  }

  error() {
     this.state.status = 'error';
     this.notify();
     
     // Reset after a delay
     setTimeout(() => {
        this.state.status = 'idle';
        this.notify();
    }, 2500);
  }
}

export const syncManager = new SyncManager();
