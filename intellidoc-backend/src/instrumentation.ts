/**
 * Next.js instrumentation hook — runs once per Node.js runtime worker.
 *
 * The heavy lifting (prototype patching + uncaughtException) is done in
 * suppress-abort.cjs which is preloaded via NODE_OPTIONS --require, so it
 * covers every process Next.js / Turbopack spawns.  This file just adds an
 * extra safety-net for anything that escapes the preload in a worker context.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // The preload already added uncaughtException/unhandledRejection handlers.
    // We only add one here if the preload was not loaded (e.g. production build
    // that doesn't use --require suppress-abort.cjs).
    if (!process.__suppressAbortLoaded) {
      process.on('uncaughtException', (err: any) => {
        if (isClientAbort(err)) return;
        console.error('Unhandled Exception:', err);
      });
      process.on('unhandledRejection', (reason: any) => {
        if (isClientAbort(reason)) return;
        console.error('Unhandled Rejection:', reason);
      });
    }
  }
}

function isClientAbort(err: any): boolean {
  if (!err) return false;
  return (
    err.code === 'ECONNRESET'          ||
    err.code === 'ECONNABORTED'        ||
    err.code === 'ERR_HTTP2_STREAM_CANCEL' ||
    err.message === 'aborted'          ||
    err.name  === 'AbortError'         ||
    err.message?.includes?.('write after end') ||
    err.type  === 'system'
  );
}
