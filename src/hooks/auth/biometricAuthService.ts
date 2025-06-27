
import { biometricAvailability } from './biometricAvailability';
import { biometricSetup } from './biometricSetup';
import { biometricSignIn } from './biometricSignIn';
import { biometricUnlock } from './biometricUnlock';
import { biometricUtils } from './biometricUtils';

export const biometricAuthService = {
  isBiometricAvailable: biometricAvailability.isBiometricAvailable,
  setupBiometric: biometricSetup.setupBiometric,
  signInWithBiometric: biometricSignIn.signInWithBiometric,
  unlockWithBiometric: biometricUnlock.unlockWithBiometric,
  arrayBufferToBase64: biometricUtils.arrayBufferToBase64,
  base64ToArrayBuffer: biometricUtils.base64ToArrayBuffer
};
