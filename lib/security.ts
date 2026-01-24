
export const initializeAntiInspect = () => {
  const isDev = () => localStorage.getItem('dev_mode') === 'true';

  // Prevent right-click context menu to make it harder to inspect
  document.addEventListener('contextmenu', (e) => {
    if (isDev()) return;
    e.preventDefault();
  });

  // Prevent common keyboard shortcuts for opening developer tools
  document.addEventListener('keydown', (e) => {
    if (isDev()) return;

    // F12
    if (e.key === 'F12') {
      e.preventDefault();
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    // Mac: Cmd+Option+I/J/C
    if (isMac && e.metaKey && e.altKey) {
        if (['i', 'j', 'c'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
    }
    
    // Windows/Linux: Ctrl+Shift+I/J/C
    if (!isMac && e.ctrlKey && e.shiftKey) {
       if (['i', 'j', 'c'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
    }

    // View Source: Ctrl+U or Cmd+U
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault();
    }
  });

  // A simple debugger loop makes using the developer tools very difficult.
  const antiDebug = () => {
    if (isDev()) return;
    try {
      (function() { return false; }
        ['constructor']('debugger')
        ['call']());
    } catch (e) {
      // The debugger statement might be caught by the browser's own debugger
    }
  };

  setInterval(antiDebug, 500);
};
