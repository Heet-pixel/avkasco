const mongoose = require('mongoose');
const Message = require('../models/Message');
const Client = require('../models/Client');
const User = require('../models/User');
const h = require('../utils/asyncHandler');
const { allowedIds } = require('./clientController');

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const clean = (v) => String(v || '').trim();
const PUBLIC = '-readBy';

// What this person may see: admins everything; employees the team chat + chats of their own clients.
async function visible(user) {
  if (user.role === 'admin') return {};
  const ids = (await allowedIds(user)).map(oid);
  return { $or: [{ room: 'team' }, { room: 'client', client: { $in: ids } }] };
}
async function clientAccess(user, id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const client = await Client.findById(id).select('name assignedTo').populate('assignedTo', 'name');
  if (!client) return null;
  if (user.role === 'admin') return client;
  return (await allowedIds(user)).includes(String(client._id)) ? client : null;
}
const populate = (q) => q.populate('sender', 'name role designation').populate('client', 'name');
const unreadOf = (user) => ({ sender: { $ne: user._id }, readBy: { $ne: user._id } });

async function send(req, res, room, client) {
  const body = clean(req.body?.body);
  if (!body) return res.status(400).json({ message: 'Type a message first.' });
  if (body.length > 2000) return res.status(400).json({ message: 'Messages can be up to 2000 characters.' });
  const m = await Message.create({ room, client, sender: req.user._id, body, readBy: [req.user._id] });
  res.status(201).json({ message: await populate(Message.findById(m._id).select(PUBLIC)).lean() });
}

// ---- team chat ------------------------------------------------------------
exports.teamList = h(async (req, res) => {
  const [members, messages] = await Promise.all([
    User.find({ active: true }).select('name role designation').sort({ name: 1 }).lean(),
    populate(Message.find({ room: 'team' }).select(PUBLIC).sort({ createdAt: -1 }).limit(300)).lean(),
  ]);
  res.json({ members, messages: messages.reverse() });
});
exports.teamSend = h((req, res) => send(req, res, 'team', null));

// ---- client chats ---------------------------------------------------------
exports.clientList = h(async (req, res) => {
  const clients = await Client.find(req.user.role === 'admin' ? { active: true } : { _id: { $in: (await allowedIds(req.user)).map(oid) }, active: true })
    .select('name assignedTo').populate('assignedTo', 'name').sort({ name: 1 }).lean();
  const ids = clients.map((c) => c._id);
  const [unreadAgg, talking] = await Promise.all([
    Message.aggregate([{ $match: { $and: [{ room: 'client', client: { $in: ids } }, unreadOf(req.user)] } }, { $group: { _id: '$client', n: { $sum: 1 } } }]),
    Message.distinct('client', { room: 'client', client: { $in: ids } }),
  ]);
  const unread = Object.fromEntries(unreadAgg.map((u) => [String(u._id), u.n]));
  // latest message of every conversation that has any
  const lastOf = {};
  await Promise.all(talking.map(async (id) => {
    const m = await Message.findOne({ room: 'client', client: id }).select('body sender createdAt').sort({ createdAt: -1 }).populate('sender', 'name').lean();
    if (m) lastOf[String(id)] = { body: m.body.slice(0, 80), at: m.createdAt, by: m.sender?.name || '' };
  }));
  res.json({
    clients: clients.map((c) => ({ ...c, unread: unread[String(c._id)] || 0, last: lastOf[String(c._id)] || null }))
      .sort((x, y) => (y.last ? +new Date(y.last.at) : 0) - (x.last ? +new Date(x.last.at) : 0) || x.name.localeCompare(y.name)),
  });
});
exports.clientThread = h(async (req, res) => {
  const client = await clientAccess(req.user, req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found.' });
  const messages = await populate(Message.find({ room: 'client', client: client._id }).select(PUBLIC).sort({ createdAt: -1 }).limit(300)).lean();
  res.json({ client, messages: messages.reverse() });
});
exports.clientSend = h(async (req, res) => {
  const client = await clientAccess(req.user, req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found.' });
  return send(req, res, 'client', client._id);
});

// ---- edit (once, by the sender only) --------------------------------------
exports.edit = h(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Message not found.' });
  const m = await Message.findById(req.params.id);
  if (!m) return res.status(404).json({ message: 'Message not found.' });
  if (String(m.sender) !== String(req.user._id)) return res.status(403).json({ message: 'You can only edit your own messages.' });
  if (m.edited) return res.status(400).json({ message: 'This message was already edited. A message can be edited only once.' });
  const body = clean(req.body?.body);
  if (!body) return res.status(400).json({ message: 'The message cannot be empty.' });
  if (body === m.body) return res.status(400).json({ message: 'Nothing was changed.' });
  m.originalBody = m.body; m.body = body; m.edited = true; m.editedAt = new Date();
  await m.save();
  res.json({ message: await populate(Message.findById(m._id).select(PUBLIC)).lean() });
});

// ---- unread counts, popups and the notification bell -----------------------
exports.summary = h(async (req, res) => {
  const unread = { $and: [await visible(req.user), unreadOf(req.user)] };
  const [team, perClient, items] = await Promise.all([
    Message.countDocuments({ $and: [unread, { room: 'team' }] }),
    Message.aggregate([{ $match: { $and: [unread, { room: 'client' }] } }, { $group: { _id: '$client', n: { $sum: 1 } } }]),
    populate(Message.find(unread).select(PUBLIC).sort({ createdAt: -1 }).limit(8)).lean(),
  ]);
  const clients = Object.fromEntries(perClient.map((c) => [String(c._id), c.n]));
  res.json({
    team, clients, total: team + perClient.reduce((a, c) => a + c.n, 0),
    items: items.map((m) => ({ _id: m._id, room: m.room, client: m.client ? { _id: m.client._id, name: m.client.name } : null, from: m.sender?.name || 'Someone', body: m.body.slice(0, 120), createdAt: m.createdAt })),
  });
});
// Mark one conversation (team, or one client) as read.
exports.read = h(async (req, res) => {
  const { room, client } = req.body || {};
  if (room === 'team') await Message.updateMany({ room: 'team', ...unreadOf(req.user) }, { $addToSet: { readBy: req.user._id } });
  else if (room === 'client' && (await clientAccess(req.user, client))) await Message.updateMany({ room: 'client', client, ...unreadOf(req.user) }, { $addToSet: { readBy: req.user._id } });
  else return res.status(400).json({ message: 'Unknown conversation.' });
  res.json({ ok: true });
});
// Clear every notification at once (clicking the bell).
exports.readAll = h(async (req, res) => {
  await Message.updateMany({ $and: [await visible(req.user), unreadOf(req.user)] }, { $addToSet: { readBy: req.user._id } });
  res.json({ ok: true });
});
