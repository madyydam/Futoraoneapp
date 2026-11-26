import tls from 'node:tls';
import { runSmtpSession } from '../supabase/functions/_shared/smtp-protocol.ts';

export function getNodeCloudflareSmtpConfig(env = process.env) {
  const host = (env.SMTP_HOST || 'smtp.mx.cloudflare.net').trim();
  const port = Number((env.SMTP_PORT || '465').trim()) || 465;
  const username = (env.SMTP_USER || 'api_token').trim();
  const password = (env.SMTP_PASS || env.CLOUDFLARE_API_TOKEN || '').trim();
  const fromEmail = (env.SMTP_FROM_EMAIL || 'sales@futoragroup.in').trim();
  const fromName = (env.SMTP_FROM_NAME || 'One').trim();

  if (!password) {
    throw new Error('Missing SMTP_PASS or CLOUDFLARE_API_TOKEN environment variable');
  }

  return {
    host,
    port,
    username,
    password,
    from: { email: fromEmail, name: fromName },
  };
}

function createNodeTlsTransport(socket, timeoutMs = 20000) {
  const lineQueue = [];
  let buffer = '';
  let ended = false;
  let socketError = null;
  let waitingResolver = null;

  const wake = () => {
    if (waitingResolver) {
      const resolve = waitingResolver;
      waitingResolver = null;
      resolve();
    }
  };

  socket.setTimeout(timeoutMs);
  socket.on('timeout', () => {
    socketError = new Error(`SMTP socket timeout after ${timeoutMs}ms`);
    socket.destroy();
    wake();
  });

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let newlineIdx = buffer.indexOf('\n');
    while (newlineIdx !== -1) {
      const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
      buffer = buffer.slice(newlineIdx + 1);
      lineQueue.push(line);
      newlineIdx = buffer.indexOf('\n');
    }
    wake();
  });

  socket.on('error', (err) => {
    socketError = err;
    ended = true;
    wake();
  });

  socket.on('close', () => {
    ended = true;
    if (buffer.length > 0) {
      lineQueue.push(buffer.replace(/\r$/, ''));
      buffer = '';
    }
    wake();
  });

  return {
    async readLine() {
      while (lineQueue.length === 0) {
        if (socketError) throw socketError;
        if (ended) return null;
        await new Promise((resolve) => {
          waitingResolver = resolve;
        });
      }
      return lineQueue.shift() ?? null;
    },
    write(data) {
      return new Promise((resolve, reject) => {
        if (socketError) {
          reject(socketError);
          return;
        }
        socket.write(data, 'utf8', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    close() {
      if (!socket.destroyed) {
        socket.end();
      }
    },
  };
}

export async function sendNodeCloudflareSmtpEmail({
  to,
  subject,
  text,
  html,
  replyTo,
  headers,
  config,
}) {
  const resolved = config ?? getNodeCloudflareSmtpConfig();

  const socket = await new Promise((resolve, reject) => {
    const conn = tls.connect(
      {
        host: resolved.host,
        port: resolved.port,
        servername: resolved.host,
      },
      () => resolve(conn)
    );
    conn.once('error', reject);
  });

  const transport = createNodeTlsTransport(socket);
  return await runSmtpSession(transport, {
    username: resolved.username,
    password: resolved.password,
    from: resolved.from,
    to,
    subject,
    text,
    html,
    replyTo: replyTo ?? resolved.from,
    headers,
    ehloHost: resolved.from.email.split('@')[1] || 'futoragroup.in',
  });
}
