// Camera Service - handles camera access and image capture
// Uses Capacitor Camera plugin on native, falls back to file input on web

// TODO: Install @capacitor/camera for native builds
// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface CapturedImage {
  dataUrl: string;
  path?: string; // Local file path on native
  format: 'jpeg' | 'png';
  width?: number;
  height?: number;
}

// Check if running in Capacitor
const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined';
};

export const cameraService = {
  /**
   * Capture a photo using the camera
   * Returns a data URL that can be displayed in an img tag
   */
  async capturePhoto(): Promise<CapturedImage | null> {
    if (isCapacitor()) {
      return this.captureWithCapacitor();
    } else {
      return this.captureWithWebInput();
    }
  },

  /**
   * Capture photo using Capacitor Camera plugin
   */
  async captureWithCapacitor(): Promise<CapturedImage | null> {
    try {
      // TODO: Uncomment when @capacitor/camera is installed
      /*
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      if (image.dataUrl) {
        return {
          dataUrl: image.dataUrl,
          path: image.path,
          format: image.format === 'png' ? 'png' : 'jpeg',
        };
      }
      */
      
      console.warn('Capacitor Camera not available, falling back to web input');
      return this.captureWithWebInput();
    } catch (error) {
      console.error('Camera capture error:', error);
      return null;
    }
  },

  /**
   * Capture photo using web file input
   */
  async captureWithWebInput(): Promise<CapturedImage | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use back camera on mobile
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const dataUrl = await this.fileToDataUrl(file);
          resolve({
            dataUrl,
            format: file.type === 'image/png' ? 'png' : 'jpeg',
          });
        } catch (error) {
          console.error('File read error:', error);
          resolve(null);
        }
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  },

  /**
   * Pick an image from the gallery
   */
  async pickFromGallery(): Promise<CapturedImage | null> {
    if (isCapacitor()) {
      try {
        // TODO: Uncomment when @capacitor/camera is installed
        /*
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });

        if (image.dataUrl) {
          return {
            dataUrl: image.dataUrl,
            path: image.path,
            format: image.format === 'png' ? 'png' : 'jpeg',
          };
        }
        */
        return this.pickFromGalleryWeb();
      } catch (error) {
        console.error('Gallery pick error:', error);
        return null;
      }
    } else {
      return this.pickFromGalleryWeb();
    }
  },

  /**
   * Pick image from gallery using web file input
   */
  async pickFromGalleryWeb(): Promise<CapturedImage | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const dataUrl = await this.fileToDataUrl(file);
          resolve({
            dataUrl,
            format: file.type === 'image/png' ? 'png' : 'jpeg',
          });
        } catch (error) {
          console.error('File read error:', error);
          resolve(null);
        }
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  },

  /**
   * Convert a File to a data URL
   */
  async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Check if camera is available
   */
  async checkPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch {
      // Permissions API not supported
      return 'prompt';
    }
  },

  /**
   * Request camera permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch {
      return false;
    }
  },
};
