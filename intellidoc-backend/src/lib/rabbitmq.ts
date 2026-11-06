import amqp, { Connection, ConfirmChannel } from 'amqplib';

let connection: any = null;
let channel: ConfirmChannel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5682';
const QUEUE_NAME = 'document_processing';

function resetConnection() {
  channel = null;
  connection = null;
}

export async function getRabbitChannel(): Promise<ConfirmChannel> {
  if (channel) return channel;

  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    connection = conn;

    // Suppress ECONNRESET from leaking as uncaughtException
    conn.on('error', (err) => {
      console.warn('RabbitMQ connection error (handled):', err?.message);
      resetConnection();
    });
    conn.on('close', () => {
      console.warn('RabbitMQ connection closed — will reconnect on next publish');
      resetConnection();
    });

    channel = await conn.createConfirmChannel();

    channel.on('error', (err) => {
      console.warn('RabbitMQ channel error (handled):', err?.message);
      channel = null;
    });
    channel.on('close', () => {
      channel = null;
    });

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
    });
    console.log('✅ Connected to RabbitMQ successfully (Confirm Channel)');
    return channel;
  } catch (error) {
    resetConnection();
    console.error('❌ Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function publishDocumentJob(
  documentId: string,
  minioPath: string,
  userId: string,
  workspaceId: string,
  knowledgeBaseId: string | null = null
) {
  const ch = await getRabbitChannel();
  const msg = JSON.stringify({
    documentId,
    minioPath,
    userId,
    workspaceId,
    knowledgeBaseId,
    timestamp: new Date().toISOString()
  });

  ch.sendToQueue(QUEUE_NAME, Buffer.from(msg), {
    persistent: true
  });

  // Await broker ack before returning (safe in both serverless and long-running)
  await ch.waitForConfirms();

  console.log(`📥 Published job for document ${documentId}`);
}
