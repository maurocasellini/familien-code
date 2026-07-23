// lib/jobs.js
// Kleiner Status-Speicher fuer Hintergrund-Reports (Upstash Redis, wie die Leads).
// Status und Text liegen unter getrennten Schluesseln, damit das Polling leicht bleibt.

import { Redis } from '@upstash/redis';

const TTL = 60 * 60 * 24 * 14; // 14 Tage

export function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function newJobId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const statusKey = (id) => `job:${id}`;
const textKey = (id) => `job:text:${id}`;

export async function setJob(id, patch) {
  const redis = getRedis();
  if (!redis) return null;
  let cur = {};
  try {
    const raw = await redis.get(statusKey(id));
    if (raw) cur = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) { /* erster Schreibvorgang */ }
  const next = { ...cur, ...patch, id, updatedAt: new Date().toISOString() };
  await redis.set(statusKey(id), JSON.stringify(next), { ex: TTL });
  return next;
}

export async function getJob(id) {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(statusKey(id));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function setJobText(id, text) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(textKey(id), text, { ex: TTL });
}

export async function getJobText(id) {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(textKey(id));
  return raw == null ? null : String(raw);
}
