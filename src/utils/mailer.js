// All email goes through AWS SES (credentials come from AWS_* variables in .env).
const nodemailer = require('nodemailer');
const aws = require('@aws-sdk/client-ses');

let transport;
function getTransport() {
  if (transport !== undefined) return transport;
  transport = process.env.AWS_REGION && process.env.SES_FROM
    ? nodemailer.createTransport({ SES: { ses: new aws.SESClient({ region: process.env.AWS_REGION }), aws } })
    : null;
  return transport;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
exports.oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();
exports.firm = () => process.env.FIRM_NAME || 'AVKAS & Co.';

// send({ to, subject, lines | text, replyTo, attachments }) -> true if sent, false if not (never throws)
exports.send = async ({ to, subject, lines, text, replyTo, attachments }) => {
  const t = getTransport();
  if (!t || !to) {
    console.warn('Email not sent: set AWS_REGION, SES_FROM (and MAIL_TO) in .env.');
    return false;
  }
  const plain = lines ? lines.map(([k, v]) => `${k}: ${v}`).join('\n') : text;
  const html = lines
    ? `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${lines.map(([k, v]) => `<tr><td valign="top"><b>${esc(k)}</b></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`
    : `<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${esc(text).replace(/\n/g, '<br>')}</p>`;
  try {
    await t.sendMail({ from: process.env.SES_FROM, to, replyTo, subject: exports.oneLine(subject), text: plain, html, attachments });
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    return false;
  }
};
