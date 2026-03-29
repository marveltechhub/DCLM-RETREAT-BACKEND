import mongoose from 'mongoose';
import { Counter } from '../models/Counter.js';

const COUNTER_ID = 'dclm_er_reg';

/**
 * Atomically increments sequence and returns next registration number string.
 */
export async function getNextRegistrationNumber(session = null) {
  const opts = { new: true, upsert: true };
  if (session) opts.session = session;

  const counter = await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    opts
  );

  const n = counter.seq;
  const padded = String(n).padStart(4, '0');
  return `DCLM-ER-${padded}`;
}

export async function createRegistrationInTransaction(createFn) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const regNumber = await getNextRegistrationNumber(session);
    const doc = await createFn(regNumber, session);
    await session.commitTransaction();
    return doc;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
