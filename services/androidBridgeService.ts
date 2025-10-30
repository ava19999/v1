// services/androidBridgeService.ts
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithCustomToken } from 'firebase/auth';
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

  isAndroidBridgeAvailable(): boolean {
    return !!(window as any).Android && typeof (window as any).Android.getAuthToken === 'function';
  }

  isNativeAndroidApp(): boolean {
    return (window as any).IS_NATIVE_ANDROID_APP === true || this.isAndroidBridgeAvailable();
  }

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

  // Cek jenis token
  private getTokenType(token: string): 'google' | 'firebase' | 'invalid' {
    try {
      const decoded: any = jwtDecode(token);
      console.log('[BRIDGE] Decoded token:', decoded);
      
      // Cek issuer untuk menentukan jenis token
      if (decoded.iss === 'https://accounts.google.com' || decoded.aud === this.getGoogleClientId()) {
        return 'google';
      } else if (decoded.iss && decoded.iss.includes('google.com')) {
        return 'google';
      } else if (decoded.iss === `https://securetoken.google.com/${this.getFirebaseProjectId()}`) {
        return 'firebase';
      } else {
        console.log('[BRIDGE] Unknown token issuer:', decoded.iss);
        return 'invalid';
      }
    } catch (error) {
      console.error('[BRIDGE] Error decoding token:', error);
      return 'invalid';
    }
  }

  private getGoogleClientId(): string {
    return process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
  }

  private getFirebaseProjectId(): string {
    return process.env.REACT_APP_FIREBASE_PROJECT_ID || 'gen-lang-client-0496903959';
  }

  // Proses login dengan token dari Android
  async handleAndroidAuth(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      console.log('[BRIDGE] Processing Android auth token...');

      const tokenType = this.getTokenType(token);
      console.log('[BRIDGE] Token type:', tokenType);

      let userCredential;

      if (tokenType === 'google') {
        // Token Google OAuth - gunakan signInWithCredential
        console.log('[BRIDGE] Using Google OAuth token');
        const credential = GoogleAuthProvider.credential(token);
        userCredential = await signInWithCredential(this.auth, credential);
      } else if (tokenType === 'firebase') {
        // Token Firebase - coba gunakan sebagai custom token
        console.log('[BRIDGE] Using Firebase ID token as custom token');
        userCredential = await signInWithCustomToken(this.auth, token);
      } else {
        // Token tidak valid, coba fallback
        console.log('[BRIDGE] Token type invalid, trying fallback...');
        return await this.fallbackAuth(token);
      }

      const firebaseUser = userCredential.user;
      console.log('[BRIDGE] Firebase login successful:', firebaseUser.email);

      // Buat atau update user di localStorage
      await this.createOrUpdateLocalUser(firebaseUser);

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
      
      // Fallback: coba buat user langsung dari token tanpa Firebase
      console.log('[BRIDGE] Trying fallback authentication without Firebase');
      const fallbackResult = await this.fallbackAuth(token);
      if (fallbackResult.success) {
        return fallbackResult;
      }
      
      this.notifyAuthFailed(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Fallback authentication tanpa Firebase
  private async fallbackAuth(token: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      console.log('[BRIDGE] Attempting fallback authentication...');
      
      const decoded: any = jwtDecode(token);
      const { email, name, picture } = decoded;

      if (!email) {
        throw new Error('No email found in token');
      }

      console.log('[BRIDGE] Fallback auth for user:', email);

      // Cek apakah user sudah ada
      let existingUser = this.findUserByEmail(email);
      
      if (!existingUser) {
        // Buat user baru
        const usernameFromEmail = email.split('@')[0];
        existingUser = {
          email,
          username: usernameFromEmail,
          googleProfilePicture: picture,
          createdAt: Date.now()
        };
        
        // Simpan user
        this.saveUserToLocalStorage(existingUser);
        console.log('[BRIDGE] Created new user in fallback:', usernameFromEmail);
      } else {
        console.log('[BRIDGE] Found existing user in fallback:', existingUser.username);
      }

      // Set current user
      localStorage.setItem('currentUser', JSON.stringify(existingUser));
      
      this.notifyAuthSuccess();
      
      return {
        success: true,
        user: existingUser
      };
      
    } catch (error) {
      console.error('[BRIDGE] Fallback auth failed:', error);
      return {
        success: false,
        error: 'Fallback authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  private findUserByEmail(email: string): any {
    try {
      const savedUsers = localStorage.getItem('cryptoUsers');
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        return Object.values(users).find((u: any) => u.email === email) || null;
      }
    } catch (error) {
      console.error('[BRIDGE] Error finding user:', error);
    }
    return null;
  }

  private saveUserToLocalStorage(user: any): void {
    try {
      const savedUsers = localStorage.getItem('cryptoUsers');
      const users = savedUsers ? JSON.parse(savedUsers) : {};
      users[user.email] = user;
      localStorage.setItem('cryptoUsers', JSON.stringify(users));
    } catch (error) {
      console.error('[BRIDGE] Error saving user:', error);
    }
  }

  private async createOrUpdateLocalUser(firebaseUser: any): Promise<void> {
    try {
      const { email, displayName, photoURL } = firebaseUser;
      
      let existingUser = this.findUserByEmail(email);
      
      if (!existingUser) {
        const usernameFromEmail = email.split('@')[0];
        const newUser = {
          email,
          username: displayName || usernameFromEmail,
          googleProfilePicture: photoURL,
          createdAt: Date.now()
        };
        
        this.saveUserToLocalStorage(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        console.log('[BRIDGE] Created new user from Firebase:', newUser.username);
      } else {
        localStorage.setItem('currentUser', JSON.stringify(existingUser));
        console.log('[BRIDGE] Updated current user from Firebase:', existingUser.username);
      }
    } catch (error) {
      console.error('[BRIDGE] Error creating/updating local user:', error);
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