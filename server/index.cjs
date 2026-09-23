const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = Number(process.env.PORT || 8787);
const users = new Map();
const posts = [];
const messages = [];
const clients = new Set();

app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const id = () => crypto.randomUUID();
const requireUser = (req, res, next) => {
  const userId = req.header('x-user-id') || req.query.userId;
  if (!userId) return res.status(401).json({ error: 'Missing anonymous session' });
  req.userId = userId;
  next();
};
const publish = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/session', (req, res) => {
  const userId = req.body?.userId || id();
  res.json({ uid: userId });
});
app.get('/api/profile', requireUser, (req, res) => res.json(users.get(req.userId) || null));
app.put('/api/profile', requireUser, (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '_');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Use 3-20 letters, numbers, or underscores.' });
  for (const [uid, profile] of users) if (uid !== req.userId && profile.username === username) return res.status(409).json({ error: 'That username is already taken.' });
  const profile = { uid: req.userId, username, displayName: username, ...(users.get(req.userId) || {}), updatedAt: Date.now() };
  users.set(req.userId, profile);
  publish('profile', profile);
  res.json(profile);
});
app.get('/api/users', requireUser, (req, res) => {
  const q = String(req.query.q || '').toLowerCase().replace(/^@/, '');
  res.json([...users.values()].filter((u) => u.uid !== req.userId && u.username.includes(q)).slice(0, 10));
});
app.get('/api/posts', (_req, res) => res.json(posts.slice().reverse()));
app.post('/api/posts', requireUser, (req, res) => {
  const post = { id: id(), authorId: req.userId, authorName: users.get(req.userId)?.username || 'anonymous', caption: String(req.body?.caption || '').slice(0, 2000), mediaUrl: null, mediaType: null, timestamp: Date.now(), likes: 0 };
  posts.push(post); publish('posts', posts); res.status(201).json(post);
});
app.post('/api/posts/:postId/like', requireUser, (req, res) => {
  const post = posts.find((item) => item.id === req.params.postId);
  if (!post) return res.sendStatus(404);
  post.likes += 1; publish('posts', posts); res.json(post);
});
app.delete('/api/posts/:postId', requireUser, (req, res) => {
  const index = posts.findIndex((item) => item.id === req.params.postId && item.authorId === req.userId);
  if (index < 0) return res.status(404).json({ error: 'Post not found or not owned by you.' });
  posts.splice(index, 1);
  publish('posts', posts);
  res.sendStatus(204);
});
app.get('/api/chat', requireUser, (req, res) => {
  const contact = String(req.query.contact || '');
  res.json(messages.filter((m) => (m.authorId === req.userId && m.recipientId === contact) || (m.authorId === contact && m.recipientId === req.userId)));
});
app.get('/api/chat/threads', requireUser, (req, res) => {
  const threads = new Map();
  for (const message of messages) {
    if (message.authorId !== req.userId && message.recipientId !== req.userId) continue;
    const contactId = message.authorId === req.userId ? message.recipientId : message.authorId;
    const contact = users.get(contactId);
    if (!contact) continue;
    const current = threads.get(contactId);
    if (!current || current.lastMessage.timestamp < message.timestamp) {
      threads.set(contactId, {
        uid: contactId,
        username: contact.username,
        lastMessage: { text: message.text, timestamp: message.timestamp, authorId: message.authorId },
        unread: 0
      });
    }
  }
  res.json([...threads.values()].sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp));
});
app.post('/api/chat', requireUser, (req, res) => {
  const recipientId = String(req.body?.recipientId || '');
  if (!recipientId || !String(req.body?.text || '').trim()) return res.status(400).json({ error: 'Recipient and message are required.' });
  const message = { id: id(), authorId: req.userId, authorName: users.get(req.userId)?.username || 'anonymous', recipientId, recipientName: users.get(recipientId)?.username || null, text: String(req.body.text), timestamp: Date.now(), isEncrypted: Boolean(req.body.isEncrypted) };
  messages.push(message); publish('message', message); res.status(201).json(message);
});
app.get('/api/events', requireUser, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders();
  res.write('event: ready\ndata: {}\n\n'); clients.add(res);
  req.on('close', () => clients.delete(res));
});

if (process.env.NODE_ENV === 'production') app.use(express.static(path.join(__dirname, '..', 'dist')));
app.listen(port, '0.0.0.0', () => console.log(`Kryptos backend listening on http://localhost:${port}`));
