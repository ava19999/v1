// services/androidBridgeService.ts
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { jwtDecode } from 'jwt-decode';

export class AndroidBridgeService {
  private static instance: AndroidBridgeService;
  private auth = getAuth();

  static getInstance(): AndroidBridgeService {
    if (!AndroidBridgeService.instance) {
      AndroidBridgeService.instance = new AndroidBridgeService();
    }
    return AndroidBridgeService.instance;
  }

  // Cek apakah berjalan di Android WebView dengan bridge
  isAndroidBridgeAvailable(): boolean {
    return !!(window as any).Android && typeof (window as any).Android.getAuthToken === 'function';
  }

  // Cek apakah native app (baik dengan bridge atau flag)
  isNativeAndroidApp(): boolean {
    return (window as any).IS_NATIVE_ANDROID_APP === true || this.isAndroidBridgeAvailable();
  }

  // Dapatkan token dari Android bridge
  getTokenFromBridge(): string | null {
    if (!this.isAndroidBridgeAvailable()) {
      console.log('[BRIDGE] Android bridge not available');
      return null;
    }

    try {
      const token = (window as any).Android.getAuthToken();
      console.log('[BRIDGE] Token received from Android:', token ? 'YES' : 'NO');
      return token;
    } catch (error) {
      console.error('[BRIDGE] Error getting token from Android:', error);
      this.showToastToAndroid('Error getting auth token');
      return null;
    }
  }

  // Proses login dengan token dari Android
  async handleAndroidAuth(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      console.log('[BRIDGE] Processing Android auth token...');

      // Decode token untuk mendapatkan user info
      const decoded: { email: string; name: string; picture: string } = jwtDecode(token) as any;
      const { email, name, picture } = decoded;

      console.log('[BRIDGE] Decoded token for:', email);

      // Login ke Firebase dengan credential Google
      const credential = GoogleAuthProvider.credential(token);
      const userCredential = await signInWithCredential(this.auth, credential);
      const firebaseUser = userCredential.user;

      console.log('[BRIDGE] Firebase login successful:', firebaseUser.email);

      // Notify Android tentang success
      this.notifyAuthSuccess();

      return {
        success: true,
        user: {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        }
      };

    } catch (error) {
      console.error('[BRIDGE] Android auth failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      this.notifyAuthFailed(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Kirim notifikasi success ke Android
  private notifyAuthSuccess(): void {
    if (this.isAndroidBridgeAvailable() && typeof (window as any).Android.onAuthSuccess === 'function') {
      try {
        (window as any).Android.onAuthSuccess();
        console.log('[BRIDGE] Notified Android about auth success');
      } catch (error) {
        console.error('[BRIDGE] Error notifying Android about success:', error);
      }
    }
  }

  // Kirim notifikasi failed ke Android
  private notifyAuthFailed(error: string): void {
    if (this.isAndroidBridgeAvailable() && typeof (window as any).Android.onAuthFailed === 'function') {
      try {
        (window as any).Android.onAuthFailed(error);
        console.log('[BRIDGE] Notified Android about auth failure:', error);
      } catch (error) {
        console.error('[BRIDGE] Error notifying Android about failure:', error);
      }
    }
  }

  // Tampilkan toast ke Android
  private showToastToAndroid(message: string): void {
    if (this.isAndroidBridgeAvailable() && typeof (window as any).Android.showToast === 'function') {
      try {
        (window as any).Android.showToast(message);
      } catch (error) {
        console.error('[BRIDGE] Error showing toast to Android:', error);
      }
    }
  }

  // Get bridge status untuk debugging
  getBridgeStatus() {
    return {
      isNativeApp: this.isNativeAndroidApp(),
      hasAndroidBridge: this.isAndroidBridgeAvailable(),
      bridgeMethods: this.isAndroidBridgeAvailable() ? {
        getAuthToken: typeof (window as any).Android.getAuthToken,
        showToast: typeof (window as any).Android.showToast,
        onAuthSuccess: typeof (window as any).Android.onAuthSuccess,
        onAuthFailed: typeof (window as any).Android.onAuthFailed
      } : null
    };
  }
}