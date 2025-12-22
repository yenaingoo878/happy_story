type ProgressListener = (progress: number, fileName: string | null) => void;

class UploadManager {
  private listener: ProgressListener | null = null;

  subscribe(listener: ProgressListener) {
    this.listener = listener;
  }

  unsubscribe() {
    this.listener = null;
  }

  start(fileName: string) {
    this.listener?.(0, fileName);
  }
  
  progress(value: number, fileName: string) {
     this.listener?.(value, fileName);
  }

  finish() {
    // Keep the completed bar visible for a moment before hiding
    setTimeout(() => {
        // -1 signals to hide the component
        this.listener?.(-1, null);
    }, 1500); 
  }

  error() {
     // Hide immediately on error
     this.listener?.(-1, null);
  }
}

export const uploadManager = new UploadManager();
