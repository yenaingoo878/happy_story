export const initializeAntiInspect = () => {
  // Prevent right-click context menu to make it harder to inspect
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Prevent common keyboard shortcuts for opening developer tools
  document.addEventListener('keydown', (e) => {
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
  // This is a deterrent, not a foolproof security measure.
  const antiDebug = () => {
    try {
      (function() { return false; }
        ['constructor']('debugger')
        ['call']());
    } catch (e) {
      // The debugger statement might be caught by the browser's own debugger,
      // and we don't want to show an error in the console.
    }
  };

  setInterval(antiDebug, 500);
};
