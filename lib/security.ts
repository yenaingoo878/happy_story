
/**
 * Security utility to discourage unauthorized inspection of the application.
 * Note: While this provides a layer of UI-level protection, true security 
 * must always be handled on the server-side.
 */
export const initializeAntiInspect = () => {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click Context Menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, false);

  // 2. Disable Keyboard Shortcuts for DevTools
  document.addEventListener('keydown', (e) => {
    // Disable F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Elements)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'U') {
      e.preventDefault();
      return false;
    }
    
    // Disable Cmd+Opt+I (Mac Inspect)
    if (e.metaKey && e.altKey && e.key === 'i') {
      e.preventDefault();
      return false;
    }
  }, false);

  console.log("%cSecurity Active: Little Moments Protected.", "color: #FF9AA2; font-size: 14px; font-weight: bold;");
};
