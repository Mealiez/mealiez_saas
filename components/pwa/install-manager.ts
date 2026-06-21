'use client'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

export type PwaPlatform = 'ios' | 'android' | 'other';

export type InstallState = 'not-installed' | 'dismissed' | 'installed';

type StateChangeListener = () => void;

class PwaInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: Set<StateChangeListener> = new Set();
  private platform: PwaPlatform = 'other';
  private isStandalone: boolean = false;

  constructor() {
    if (typeof window === 'undefined') return;

    this.detectPlatform();
    this.detectInstallation();

    // Check if there was a saved prompt in global scope
    if ((window as any).deferredBeforeInstallPrompt) {
      this.deferredPrompt = (window as any).deferredBeforeInstallPrompt;
      this.notifyListeners();
    }

    // Capture standard and custom install prompts
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      // Also store globally for other components that load later
      (window as any).deferredBeforeInstallPrompt = e;
      this.notifyListeners();
    });

    window.addEventListener('d-beforeinstallprompt', (e: Event) => {
      const customEvent = e as CustomEvent<BeforeInstallPromptEvent>;
      if (customEvent.detail) {
        this.deferredPrompt = customEvent.detail;
        this.notifyListeners();
      }
    });

    // Detect installation via browser media query
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) {
        this.markAsInstalled();
      }
    });

    // Monitor focus to detect stand-alone change in background
    window.addEventListener('focus', () => {
      this.detectInstallation();
    });
  }

  private detectPlatform() {
    if (typeof window === 'undefined') return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIpad = /ipad/.test(userAgent) || (window.navigator.maxTouchPoints > 1 && userAgent.includes('macintosh'));
    
    if (/iphone|ipod/.test(userAgent) || isIpad) {
      this.platform = 'ios';
    } else if (/android/.test(userAgent)) {
      this.platform = 'android';
    } else {
      this.platform = 'other';
    }
  }

  public detectInstallation(): boolean {
    if (typeof window === 'undefined') return false;

    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       !!(window.navigator as any).standalone;

    const alreadyMarked = localStorage.getItem('mealiez-pwa-installed') === 'true';

    if (standalone || alreadyMarked) {
      this.isStandalone = true;
      if (!alreadyMarked) {
        this.markAsInstalled();
      }
      return true;
    }

    this.isStandalone = false;
    return false;
  }

  private markAsInstalled() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('mealiez-pwa-installed', 'true');
    this.trackAnalytics('pwa_installed');
    this.notifyListeners();
  }

  public getPlatform(): PwaPlatform {
    return this.platform;
  }

  public isInstalled(): boolean {
    return this.isStandalone || (typeof window !== 'undefined' && localStorage.getItem('mealiez-pwa-installed') === 'true');
  }

  public getCooldownStatus() {
    if (typeof window === 'undefined') return { isCooldownActive: false };

    if (this.isInstalled()) {
      return { isCooldownActive: true }; // Never show banner if installed
    }

    const dismissCountStr = localStorage.getItem('mealiez-pwa-dismiss-count');
    const lastDismissedStr = localStorage.getItem('mealiez-pwa-last-dismissed');

    if (!dismissCountStr || !lastDismissedStr) {
      return { isCooldownActive: false };
    }

    const dismissCount = parseInt(dismissCountStr, 10);
    const lastDismissedAt = parseInt(lastDismissedStr, 10);

    let cooldownMs = 0;
    if (dismissCount === 1) {
      cooldownMs = 24 * 60 * 60 * 1000; // 24 hours
    } else if (dismissCount === 2) {
      cooldownMs = 3 * 24 * 60 * 60 * 1000; // 3 days
    } else if (dismissCount === 3) {
      cooldownMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else if (dismissCount >= 4) {
      cooldownMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    const now = Date.now();
    const elapsed = now - lastDismissedAt;
    const isCooldownActive = elapsed < cooldownMs;

    return {
      isCooldownActive,
      dismissCount,
      lastDismissedAt,
      timeLeftMs: cooldownMs - elapsed,
      cooldownMs
    };
  }

  public shouldShowBanner(): boolean {
    if (typeof window === 'undefined') return false;

    // Must not be installed
    if (this.isInstalled()) return false;

    // Check cooldown
    const { isCooldownActive } = this.getCooldownStatus();
    if (isCooldownActive) return false;

    return true;
  }

  public async triggerInstall(): Promise<boolean> {
    this.trackAnalytics('manual_install_clicked');

    if (this.platform === 'ios') {
      this.trackAnalytics('ios_install_instructions_opened');
      return false; // iOS opens instructions modal instead
    }

    if (this.deferredPrompt) {
      try {
        this.trackAnalytics('install_prompt_shown');
        await this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          this.trackAnalytics('install_prompt_accepted');
          this.markAsInstalled();
          this.deferredPrompt = null;
          this.notifyListeners();
          return true;
        } else {
          this.trackAnalytics('install_prompt_dismissed');
          this.dismiss();
          return false;
        }
      } catch (err) {
        console.error('PWA Native Install failed:', err);
      }
    }

    return false;
  }

  public dismiss() {
    if (typeof window === 'undefined') return;

    this.trackAnalytics('install_prompt_dismissed');

    const countStr = localStorage.getItem('mealiez-pwa-dismiss-count') || '0';
    const nextCount = parseInt(countStr, 10) + 1;

    localStorage.setItem('mealiez-pwa-dismiss-count', nextCount.toString());
    localStorage.setItem('mealiez-pwa-last-dismissed', Date.now().toString());

    this.notifyListeners();
  }

  public isPromptSupported(): boolean {
    return !!this.deferredPrompt;
  }

  public subscribe(listener: StateChangeListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  public trackAnalytics(eventName: string) {
    console.log(`[PWA_ANALYTICS] Event: ${eventName}`);
    try {
      if (typeof window !== 'undefined') {
        const customEvent = new CustomEvent('pwa-analytics', { detail: { event: eventName } });
        window.dispatchEvent(customEvent);
      }
    } catch (e) {}
  }
}

export const installManager = new PwaInstallManager();
