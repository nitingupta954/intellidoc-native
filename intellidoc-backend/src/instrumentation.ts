export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err: any) => {
      // Ignore Next.js client abort ECONNRESET
      if (err && err.code === 'ECONNRESET' && err.message === 'aborted') {
        return;
      }
      console.error('Unhandled Exception:', err);
      process.exit(1);
    });
  }
}
