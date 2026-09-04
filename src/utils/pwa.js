/**
 * PWA Helper Utilities for NabPrize Esports
 */

export const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
};

export const promptPwaInstall = async () => {
  const promptEvent = window.__np_deferred_prompt;
  if (!promptEvent) return { success: false, reason: 'no_prompt' };

  try {
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      window.__np_deferred_prompt = null;
      return { success: true, outcome: 'accepted' };
    }
    return { success: false, outcome: 'dismissed' };
  } catch (err) {
    console.error('Error triggering PWA install prompt:', err);
    return { success: false, error: err };
  }
};
