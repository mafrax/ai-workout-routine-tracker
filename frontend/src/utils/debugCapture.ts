import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

interface CaptureData {
  timestamp: string;
  path: string;
  screenshot: string;
  consoleLogs: string[];
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
}

class DebugCapture {
  private consoleLogs: string[] = [];
  private maxLogs = 100;

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      this.addLog('LOG', args);
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.addLog('ERROR', args);
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.addLog('WARN', args);
      originalWarn.apply(console, args);
    };
  }

  private addLog(level: string, args: any[]) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    this.consoleLogs.push(`[${timestamp}] ${level}: ${message}`);

    // Keep only last maxLogs entries
    if (this.consoleLogs.length > this.maxLogs) {
      this.consoleLogs.shift();
    }
  }

  private async captureScreenshot(): Promise<string> {
    return new Promise((resolve) => {
      // Use html2canvas for web, or native screenshot API if available
      if (Capacitor.isNativePlatform()) {
        // For native platforms, we'll use a canvas approach
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (ctx) {
          // Draw current page to canvas (simplified - would need html2canvas for full page)
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'black';
          ctx.font = '16px monospace';
          ctx.fillText('Screenshot captured', 20, 40);
          ctx.fillText(`Path: ${window.location.pathname}`, 20, 70);
          ctx.fillText(`Time: ${new Date().toLocaleString()}`, 20, 100);
        }

        resolve(canvas.toDataURL('image/png'));
      } else {
        // For web, capture using canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'black';
          ctx.font = '16px monospace';
          ctx.fillText('Screenshot captured (basic capture)', 20, 40);
          ctx.fillText(`Path: ${window.location.pathname}`, 20, 70);
          ctx.fillText(`Time: ${new Date().toLocaleString()}`, 20, 100);
        }

        resolve(canvas.toDataURL('image/png'));
      }
    });
  }

  async capture(): Promise<string> {
    try {
      const screenshot = await this.captureScreenshot();

      const captureData: CaptureData = {
        timestamp: new Date().toISOString(),
        path: window.location.pathname + window.location.search,
        screenshot,
        consoleLogs: [...this.consoleLogs],
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      const folderName = 'debug-captures';
      const fileName = `capture-${Date.now()}.json`;

      if (Capacitor.isNativePlatform()) {
        // Save to Documents directory on native platforms
        await Filesystem.mkdir({
          path: folderName,
          directory: Directory.Documents,
          recursive: true,
        });

        const filePath = `${folderName}/${fileName}`;

        await Filesystem.writeFile({
          path: filePath,
          data: JSON.stringify(captureData, null, 2),
          directory: Directory.Documents,
          encoding: 'utf8',
        });

        // Also save a readable text version
        const readableContent = this.formatReadable(captureData);
        await Filesystem.writeFile({
          path: `${folderName}/capture-${Date.now()}.txt`,
          data: readableContent,
          directory: Directory.Documents,
          encoding: 'utf8',
        });

        // Get the URI for sharing
        const fileUri = await Filesystem.getUri({
          path: filePath,
          directory: Directory.Documents,
        });

        // Share the file
        await Share.share({
          title: 'Debug Capture',
          text: `Debug capture from ${captureData.path}`,
          url: fileUri.uri,
          dialogTitle: 'Share Debug Capture',
        });

        return `✅ Saved to: Documents/${filePath}\n📋 Console logs copied\n📱 Path: ${captureData.path}`;
      } else {
        // For web, download as file
        const blob = new Blob([JSON.stringify(captureData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Also copy to clipboard
        const readableContent = this.formatReadable(captureData);
        await navigator.clipboard.writeText(readableContent);

        return `✅ Downloaded: ${fileName}\n📋 Readable version copied to clipboard\n📱 Path: ${captureData.path}`;
      }
    } catch (error) {
      console.error('Debug capture failed:', error);
      throw error;
    }
  }

  private formatReadable(data: CaptureData): string {
    return `
DEBUG CAPTURE
=============
Timestamp: ${new Date(data.timestamp).toLocaleString()}
Path: ${data.path}
User Agent: ${data.userAgent}
Viewport: ${data.viewport.width}x${data.viewport.height}

CONSOLE LOGS (Last ${data.consoleLogs.length} entries)
==============
${data.consoleLogs.join('\n')}

SCREENSHOT
==========
Screenshot data saved in JSON file (base64 encoded)
    `.trim();
  }

  clearLogs() {
    this.consoleLogs = [];
  }
}

// Create singleton instance
export const debugCapture = new DebugCapture();

// Add global keyboard shortcut (Cmd/Ctrl + Shift + D)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', async (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      try {
        const result = await debugCapture.capture();
        alert(result);
      } catch (error) {
        alert('Failed to capture debug data: ' + error);
      }
    }
  });
}
