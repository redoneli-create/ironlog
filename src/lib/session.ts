import { db, localDate, uid, type Routine, type Session, type SetLog } from "./db";

export const isDone = (logs: SetLog[], exerciseId: string, setNo: number) =>
  logs.some((l) => l.exerciseId === exerciseId && l.setNo === setNo);

export const plannedSets = (routine?: Routine) =>
  routine?.blocks.reduce((n, b) => n + b.exercises.reduce((m, e) => m + e.sets, 0), 0) ?? 0;

export const sessionVolume = (logs: SetLog[]) =>
  Math.round(logs.reduce((v, l) => v + l.weight * l.reps, 0));

export async function startSession(programId: string | undefined, routineId: string): Promise<string> {
  const id = uid();
  const session: Session = {
    id,
    programId,
    routineId,
    date: localDate(),
    startedAt: Date.now(),
    logs: [],
  };
  await db.sessions.put(session);
  return id;
}

export async function toggleSet(
  session: Session,
  exerciseId: string,
  setNo: number,
  weight: number,
  reps: number,
): Promise<void> {
  const logs = isDone(session.logs, exerciseId, setNo)
    ? session.logs.filter((l) => !(l.exerciseId === exerciseId && l.setNo === setNo))
    : [...session.logs, { exerciseId, setNo, weight, reps, doneAt: Date.now() }];
  await db.sessions.update(session.id, { logs });
}

export const finishSession = (session: Session) =>
  db.sessions.update(session.id, { endedAt: Date.now() });

export const discardSession = (session: Session) => db.sessions.delete(session.id);

/** Ongoing session = started but not finished. */
export const activeSession = () => db.sessions.filter((s) => !s.endedAt).first();
