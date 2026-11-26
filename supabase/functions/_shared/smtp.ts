import {
  runSmtpSession,
  type EmailAddress,
  type SmtpSendResult,
  type SmtpTransport,
} from './smtp-protocol.ts';

export interface CloudflareSmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from: EmailAddress;
}

export function getCloudflareSmtpConfig(): CloudflareSmtpConfig {
  const host = (Deno.env.get('SMTP_HOST') ?? 'smtp.mx.cloudflare.net').trim();
  const port = Number((Deno.env.get('SMTP_PORT') ?? '465').trim());
  const username = (Deno.env.get('SMTP_USER') ?? 'api_token').trim();
  const password = (
    Deno.env.get('SMTP_PASS') ??
    Deno.env.get('CLOUDFLARE_API_TOKEN') ??
    ''
  ).trim();
  const fromEmail = (Deno.env.get('SMTP_FROM_EMAIL') ?? 'sales@futoragroup.in').trim();
  const fromName = (Deno.env.get('SMTP_FROM_NAME') ?? 'One').trim();

  if (!password) {
    throw new Error('Cloudflare SMTP token (SMTP_PASS or CLOUDFLARE_API_TOKEN) is not configured');
  }

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    username,
    password,
    from: { email: fromEmail, name: fromName },
  };
}

function createDenoTlsTransport(conn: Deno.TlsConn, timeoutMs = 20000): SmtpTransport {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';
  let closed = false;

  const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
    let timerId: number | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timerId = setTimeout(() => reject(new Error(`SMTP timeout during ${label}`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timerId !== undefined) clearTimeout(timerId);
    }
  };

  return {
    async readLine(): Promise<string | null> {
      for (let reads = 0; reads < 1024; reads++) {
        const newlineIdx = buffer.indexOf('\n');
        if (newlineIdx !== -1) {
          const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
          buffer = buffer.slice(newlineIdx + 1);
          return line;
        }
        const chunk = new Uint8Array(4096);
        const bytesRead = await withTimeout(conn.read(chunk), 'read');
        if (bytesRead === null) {
          if (buffer.length > 0) {
            const remaining = buffer.replace(/\r$/, '');
            buffer = '';
            return remaining;
          }
          return null;
        }
        buffer += decoder.decode(chunk.subarray(0, bytesRead), { stream: true });
      }
      throw new Error('SMTP line exceeded buffer limit');
    },
    async write(data: string): Promise<void> {
      const encoded = encoder.encode(data);
      let written = 0;
      while (written < encoded.length) {
        written += await withTimeout(conn.write(encoded.subarray(written)), 'write');
      }
    },
    close(): void {
      if (!closed) {
        closed = true;
        try {
          conn.close();
        } catch {
          // Ignore already closed socket
        }
      }
    },
  };
}

export async function sendCloudflareSmtpEmail(params: {
  to: EmailAddress;
  subject: string;
  text: string;
  html: string;
  replyTo?: EmailAddress;
  headers?: Record<string, string>;
  config?: CloudflareSmtpConfig;
}): Promise<SmtpSendResult> {
  const config = params.config ?? getCloudflareSmtpConfig();
  const conn = await Deno.connectTls({
    hostname: config.host,
    port: config.port,
  });

  const transport = createDenoTlsTransport(conn);
  return await runSmtpSession(transport, {
    username: config.username,
    password: config.password,
    from: config.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    replyTo: params.replyTo ?? config.from,
    headers: params.headers,
    ehloHost: config.from.email.split('@')[1] || 'futoragroup.in',
  });
}
