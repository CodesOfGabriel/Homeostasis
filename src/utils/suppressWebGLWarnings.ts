// Suppress non-critical warnings during development
// These warnings spam the console during hot reload but are harmless

if (import.meta.env.DEV) {
    // Store original console methods
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;

    // Filter out known non-critical warnings
    console.warn = (...args: any[]) => {
        const message = args.join(' ');

        // Suppress these specific warnings
        if (
            message.includes('texSubImage: Alpha-premult') ||
            message.includes('y-flip are deprecated') ||
            message.includes('WebGL context was lost') ||
            message.includes('Context Lost')
        ) {
            return; // Silent
        }

        originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
        const message = args.join(' ');

        // Suppress non-critical errors
        if (
            message.includes('WebGL context was lost') ||
            message.includes('Context Lost')
        ) {
            return; // Silent
        }

        originalError.apply(console, args);
    };

    console.log = (...args: any[]) => {
        const message = args.join(' ');

        // Suppress React DevTools suggestion (we know about it)
        if (
            message.includes('Download the React DevTools') ||
            message.includes('reactjs.org/link/react-devtools')
        ) {
            return; // Silent
        }

        originalLog.apply(console, args);
    };
}

export { };
