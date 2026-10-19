
import { io } from 'socket.io-client';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

const token = (await rl.question('Paste your fresh access token: ')).trim();
const documentId = (
  await rl.question('Enter the document UUID: ')
).trim();

if (!token || !documentId) {
  console.error('Token and document UUID are required.');
  rl.close();
  process.exit(1);
}

const options = {
  auth: { token },
  transports: ['websocket'],
  reconnection: false,
  timeout: 10000,
};

const clientA = io('http://localhost:4000/collaboration', options);
const clientB = io('http://localhost:4000/collaboration', options);

let joined = 0;
let finished = false;

function finish() {
  if (finished) return;
  finished = true;
  clientA.disconnect();
  clientB.disconnect();
  rl.close();
}

function joinDocument(client, name) {
  client.emit('document:join', { documentId }, (response) => {
    console.log(`${name} join response:`, response);

    if (!response?.data?.success) {
      console.error(`${name} could not join the document.`);
      finish();
      return;
    }

    joined += 1;

    if (joined === 2) {
      console.log('Both clients joined. Sending test message...');

      clientB.once('document:test:received', (message) => {
        console.log('Client B received broadcast:', message);
        finish();
      });

      clientA.emit(
        'document:test',
        { documentId, message: 'Hello from Client A!' },
        (response) => {
          console.log('Client A send response:', response);

          setTimeout(() => {
            if (!finished) {
              console.log('No broadcast received before timeout.');
              finish();
            }
          }, 3000);
        },
      );
    }
  });
}

clientA.on('connect', () => {
  console.log('Client A connected.');
  joinDocument(clientA, 'Client A');
});

clientB.on('connect', () => {
  console.log('Client B connected.');
  joinDocument(clientB, 'Client B');
});

clientA.on('connect_error', (error) => {
  console.error('Client A connection error:', error.message);
  finish();
});

clientB.on('connect_error', (error) => {
  console.error('Client B connection error:', error.message);
  finish();
});