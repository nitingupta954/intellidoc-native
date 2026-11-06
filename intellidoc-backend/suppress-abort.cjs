/**
 * suppress-abort.cjs
 *
 * Loaded via NODE_OPTIONS='--require ./suppress-abort.cjs' so it runs in
 * EVERY Node.js process that Next.js / Turbopack spawns (router process,
 * worker processes, etc.) — before any Next.js code executes.
 *
 * Purpose: silence the ECONNRESET / "Error: aborted" noise that fires
 * whenever a browser or mobile client disconnects mid-request.
 *
 * Strategy: add a no-op 'error' handler to every IncomingMessage as soon
 * as it is created by the HTTP server.  This prevents Node's EventEmitter
 * from throwing "Unhandled 'error' event" without touching the Socket
 * prototype or messing with process.emit.
 */

'use strict';

const http = require('http');
const net  = require('net');

// Mark this preload as loaded so instrumentation.ts can skip redundant registration
process.__suppressAbortLoaded = true;

// ── Helper ────────────────────────────────────────────────────────────────────
function isClientAbort(err) {
  if (!err) return false;
  return (
    err.code === 'ECONNRESET'          ||
    err.code === 'ECONNABORTED'        ||
    err.code === 'ERR_HTTP2_STREAM_CANCEL' ||
    err.message === 'aborted'          ||
    err.name  === 'AbortError'         ||
    (typeof err.message === 'string' && err.message.includes('write after end')) ||
    err.type  === 'system'
  );
}

// ── 1. Attach noop error listener to every incoming HTTP request ──────────────
//
// This is the cleanest fix: once req has at least one 'error' listener,
// Node's EventEmitter will NOT throw "Unhandled 'error' event" when
// ECONNRESET is emitted.  We only swallow client-abort errors;
// any other error is re-thrown so it surfaces normally.
//
const origServerEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (type, req, res) {
  if (type === 'request' && req) {
    req.on('error', function (err) {
      if (!isClientAbort(err)) throw err; // surface real errors
      // else: silently swallow client disconnect
    });
  }
  return origServerEmit.apply(this, arguments);
};

// ── 2. Belt-and-suspenders: also swallow on Socket / IncomingMessage ──────────
//
// In some Node.js / Next.js versions the error reaches Socket before the
// IncomingMessage 'error' listener fires.
//
const origSocketEmit = net.Socket.prototype.emit;
net.Socket.prototype.emit = function (type) {
  if (type === 'error' && isClientAbort(arguments[1])) return true;
  return origSocketEmit.apply(this, arguments);
};

const origMsgEmit = http.IncomingMessage.prototype.emit;
http.IncomingMessage.prototype.emit = function (type) {
  if (type === 'error' && isClientAbort(arguments[1])) return true;
  return origMsgEmit.apply(this, arguments);
};

// ── 3. Final safety net at process level ──────────────────────────────────────
process.on('uncaughtException', function (err) {
  if (isClientAbort(err)) return; // swallow
  // Let Next.js / Node.js handle everything else
  console.error('[suppress-abort] Unhandled Exception:', err);
});

process.on('unhandledRejection', function (reason) {
  if (isClientAbort(reason)) return;
  console.error('[suppress-abort] Unhandled Rejection:', reason);
});
