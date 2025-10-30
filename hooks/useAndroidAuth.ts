// hooks/useAndroidAuth.ts
import { useState, useEffect } from 'react';
import { AndroidBridgeService } from '../services/androidBridgeService';

export const useAndroidAuth = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<any>(null);

  const bridgeService = AndroidBridgeService.getInstance();

  useEffect(() => {
    // Update bridge status
    setBridgeStatus(bridgeService.getBridgeStatus());
  }, []);

  const checkAndroidAuth = async (): Promise<boolean> => {
    if (!bridgeService.isNativeAndroidApp()) {
      console.log('[HOOK] Not a native Android app, skipping Android auth');
      return false;
    }

    console.log('[HOOK] Starting Android bridge auth check...');
    setIsChecking(true);
    setAuthStatus('checking');
    setError(null);

    try {
      // Coba dapatkan token dari bridge
      const token = bridgeService.getTokenFromBridge();
      
      if (!token) {
        console.log('[HOOK] No token available from Android bridge');
        setAuthStatus('failed');
        setError('No authentication token available from Android bridge');
        return false;
      }

      console.log('[HOOK] Token received, processing authentication...');
      
      // Process authentication
      const result = await bridgeService.handleAndroidAuth(token);
      
      if (result.success) {
        console.log('[HOOK] Android auth successful');
        setAuthStatus('success');
        return true;
      } else {
        console.log('[HOOK] Android auth failed:', result.error);
        setAuthStatus('failed');
        setError(result.error || 'Authentication failed');
        return false;
      }

    } catch (error) {
      console.error('[HOOK] Android auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAuthStatus('failed');
      setError(errorMessage);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isChecking,
    authStatus,
    error,
    bridgeStatus,
    checkAndroidAuth,
    isNativeApp: bridgeService.isNativeAndroidApp(),
    hasAndroidBridge: bridgeService.isAndroidBridgeAvailable()
  };
};