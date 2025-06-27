
import { biometricAvailability } from './biometricAvailability';
import { biometricSetup } from './biometricSetup';
import { biometricSignIn } from './biometricSignIn';
import { biometricUtils } from './biometricUtils';

export const biometricAuthService = {
  isBiometricAvailable: biometricAvailability.isBiometricAvailable,
  setupBiometric: biometricSetup.setupBiometric,
  signInWithBiometric: biometricSignIn.signInWithBiometric,
  arrayBufferToBase64: biometricUtils.arrayBufferToBase64,
  base64ToArrayBuffer: biometricUtils.base64ToArrayBuffer
};
