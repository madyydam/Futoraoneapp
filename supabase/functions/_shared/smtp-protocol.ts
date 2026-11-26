export interface EmailAddress {
  email: string;
  name?: string;
}

export interface SmtpMessageOptions {
  from: EmailAddress;
  to: EmailAddress;
  subject: string;
  text: string;
  html: string;
  replyTo?: EmailAddress;
  headers?: Record<string, string>;
}

export interface SmtpSessionOptions extends SmtpMessageOptions {
  username: string;
  password: string;
  ehloHost?: string;
}

export interface SmtpSendResult {
  messageId: string | null;
  smtpResponse: string;
}

export interface SmtpTransport {
  readLine(): Promise<string | null>;
  write(data: string): Promise<void>;
  close(): Promise<void> | void;
}

export class SmtpError extends Error {
  readonly code: number;
  readonly stage: string;
  readonly retryable: boolean;

  constructor(message: string, code: number, stage: string) {
    super(message);
    this.name = 'SmtpError';
    this.code = code;
    this.stage = stage;
    this.retryable = code === 421 || code === 450 || code === 451 || code === 452;
  }
}

export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n\0]+/g, ' ').trim();
}

export function isValidEmailAddress(email: string): boolean {
  const cleaned = sanitizeHeaderValue(email);
  if (!cleaned || cleaned.length > 320) return false;
  return /^[^\s<>()[\]\\,;:"@]+@[^\s<>()[\]\\,;:"@]+\.[^\s<>()[\]\\,;:"@]+$/.test(cleaned);
}

export function encodeUtf8Base64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function encodeMimeWord(value: string): string {
  const clean = sanitizeHeaderValue(value);
  if (/^[\x20-\x7E]*$/.test(clean)) {
    return clean;
  }
  return `=?UTF-8?B?${encodeUtf8Base64(clean)}?=`;
}

export function formatEmailAddress(address: EmailAddress): string {
  const email = sanitizeHeaderValue(address.email);
  if (!isValidEmailAddress(email)) {
    throw new Error(`Invalid email address: ${email}`);
  }
  if (!address.name || !sanitizeHeaderValue(address.name)) {
    return `<${email}>`;
  }
  const safeName = sanitizeHeaderValue(address.name).replace(/["\\]/g, '');
  return `${encodeMimeWord(safeName)} <${email}>`;
}

export function encodeAuthPlain(username: string, password: string): string {
  return encodeUtf8Base64(`\0${username}\0${password}`);
}

export function normalizeCrlf(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
}

export function dotStuff(mimeMessage: string): string {
  const crlf = normalizeCrlf(mimeMessage);
  const stuffed = crlf.replace(/(^|\r\n)\./g, '$1..');
  return stuffed.endsWith('\r\n') ? `${stuffed}.\r\n` : `${stuffed}\r\n.\r\n`;
}

function wrapBase64(base64: string, width = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += width) {
    lines.push(base64.slice(i, i + width));
  }
  return lines.join('\r\n');
}

export function buildMimeMessage(options: SmtpMessageOptions): {
  raw: string;
  generatedMessageId: string;
} {
  const fromEmail = sanitizeHeaderValue(options.from.email);
  const domain = fromEmail.split('@')[1] || 'futoragroup.in';
  const generatedMessageId = `<${crypto.randomUUID()}@${domain}>`;
  const boundary = `----=_FutoraOne_${crypto.randomUUID().replace(/-/g, '')}`;
  const dateHeader = new Date().toUTCString();

  const headers: string[] = [
    `Date: ${dateHeader}`,
    `From: ${formatEmailAddress(options.from)}`,
    `To: ${formatEmailAddress(options.to)}`,
    `Subject: ${encodeMimeWord(options.subject)}`,
    `Message-ID: ${generatedMessageId}`,
    'MIME-Version: 1.0',
  ];

  if (options.replyTo && isValidEmailAddress(options.replyTo.email)) {
    headers.push(`Reply-To: ${formatEmailAddress(options.replyTo)}`);
  }

  if (options.headers) {
    for (const [rawKey, rawVal] of Object.entries(options.headers)) {
      const key = sanitizeHeaderValue(rawKey).replace(/[^A-Za-z0-9-]/g, '');
      const val = sanitizeHeaderValue(rawVal);
      if (key && val) {
        headers.push(`${key}: ${val}`);
      }
    }
  }

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const plainBody = wrapBase64(encodeUtf8Base64(normalizeCrlf(options.text)));
  const htmlBody = wrapBase64(encodeUtf8Base64(normalizeCrlf(options.html)));

  const parts = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    plainBody,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlBody,
    `--${boundary}--`,
    '',
  ];

  return {
    raw: parts.join('\r\n'),
    generatedMessageId,
  };
}

export function parseSmtpReply(lines: string[]): { code: number; text: string } {
  const joined = lines.join('\n');
  const lastLine = lines[lines.length - 1] ?? '';
  const match = lastLine.match(/^(\d{3})(?: (.*))?$/);
  if (!match) {
    throw new SmtpError(`Malformed SMTP response: ${joined}`, 500, 'protocol');
  }
  return {
    code: Number(match[1]),
    text: joined,
  };
}

async function readSmtpReply(transport: SmtpTransport, stage: string): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  for (let lineCount = 0; lineCount < 200; lineCount++) {
    const line = await transport.readLine();
    if (line === null) {
      throw new SmtpError('SMTP connection closed unexpectedly', 421, stage);
    }
    lines.push(line);
    if (/^\d{3}(?: |$)/.test(line)) {
      return parseSmtpReply(lines);
    }
    if (!/^\d{3}-/.test(line)) {
      throw new SmtpError(`Unexpected SMTP line: ${line}`, 500, stage);
    }
  }
  throw new SmtpError('SMTP response exceeded maximum line limit', 500, stage);
}

function assertCode(reply: { code: number; text: string }, expected: number, stage: string): void {
  if (reply.code !== expected) {
    throw new SmtpError(`SMTP ${stage} failed (${reply.code}): ${reply.text}`, reply.code, stage);
  }
}

export function extractMessageIdFromOk(okText: string, fallbackId: string): string {
  const match = okText.match(/<[^>\s]+@[^>\s]+>/);
  return match ? match[0] : fallbackId;
}

export async function runSmtpSession(
  transport: SmtpTransport,
  options: SmtpSessionOptions
): Promise<SmtpSendResult> {
  const fromEmail = sanitizeHeaderValue(options.from.email);
  const toEmail = sanitizeHeaderValue(options.to.email);
  if (!isValidEmailAddress(fromEmail)) {
    throw new Error(`Invalid sender email: ${fromEmail}`);
  }
  if (!isValidEmailAddress(toEmail)) {
    throw new Error(`Invalid recipient email: ${toEmail}`);
  }

  const ehloHost = sanitizeHeaderValue(options.ehloHost || fromEmail.split('@')[1] || 'futoragroup.in');
  const { raw, generatedMessageId } = buildMimeMessage(options);
  const stuffedBody = dotStuff(raw);

  try {
    const greeting = await readSmtpReply(transport, 'greeting');
    assertCode(greeting, 220, 'greeting');

    await transport.write(`EHLO ${ehloHost}\r\n`);
    const ehlo = await readSmtpReply(transport, 'ehlo');
    assertCode(ehlo, 250, 'ehlo');

    await transport.write(`AUTH PLAIN ${encodeAuthPlain(options.username, options.password)}\r\n`);
    const auth = await readSmtpReply(transport, 'auth');
    assertCode(auth, 235, 'auth');

    await transport.write(`MAIL FROM:<${fromEmail}>\r\n`);
    const mailFrom = await readSmtpReply(transport, 'mail_from');
    assertCode(mailFrom, 250, 'mail_from');

    await transport.write(`RCPT TO:<${toEmail}>\r\n`);
    const rcptTo = await readSmtpReply(transport, 'rcpt_to');
    assertCode(rcptTo, 250, 'rcpt_to');

    await transport.write('DATA\r\n');
    const dataReady = await readSmtpReply(transport, 'data');
    assertCode(dataReady, 354, 'data');

    await transport.write(stuffedBody);
    const queued = await readSmtpReply(transport, 'message_delivery');
    assertCode(queued, 250, 'message_delivery');

    try {
      await transport.write('QUIT\r\n');
      await readSmtpReply(transport, 'quit');
    } catch {
      // Delivery already succeeded; ignore QUIT close errors
    }

    return {
      messageId: extractMessageIdFromOk(queued.text, generatedMessageId),
      smtpResponse: queued.text,
    };
  } finally {
    await transport.close();
  }
}
