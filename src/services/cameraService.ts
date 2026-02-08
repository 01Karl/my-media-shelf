





export interface CapturedImage {
  dataUrl: string;
  path?: string; 
  format: 'jpeg' | 'png';
  width?: number;
  height?: number;
}


const isCapacitor = (): boolean => {
  return typeof (window as any).Capacitor !== 'undefined';
};

export const cameraService = {
  



  async capturePhoto(): Promise<CapturedImage | null> {
    if (isCapacitor()) {
      return this.captureWithCapacitor();
    } else {
      return this.captureWithWebInput();
    }
  },

  


  async captureWithCapacitor(): Promise<CapturedImage | null> {
    try {
      
      
















      
      console.warn('Capacitor Camera not available, falling back to web input');
      return this.captureWithWebInput();
    } catch (error) {
      console.error('Camera capture error:', error);
      return null;
    }
  },

  


  async captureWithWebInput(): Promise<CapturedImage | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; 
      
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

  


  async pickFromGallery(): Promise<CapturedImage | null> {
    if (isCapacitor()) {
      try {
        
        















        return this.pickFromGalleryWeb();
      } catch (error) {
        console.error('Gallery pick error:', error);
        return null;
      }
    } else {
      return this.pickFromGalleryWeb();
    }
  },

  


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

  


  async checkPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch {
      
      return 'prompt';
    }
  },

  


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
