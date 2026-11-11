import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, exerciseLabel, type Exercise, type Routine } from "../lib/db";
import { fireAlarm } from "../lib/rest";

interface Step {
  kind: "work" | "rest";
  exId?: string;
  setNo?: number;
  sets?: number;
  sec: number;
  cardio?: boolean;
}

const fmt = (s: number) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
const label = (s: number) => (s < 60 ? s + " 秒" : (s % 60 ? (s / 60).toFixed(1) : s / 60) + " 分钟");

const WORK_OPTIONS = [15, 20, 30, 40, 45, 60, 90, 120, 180, 300, 600, 900, 1200];
const REST_OPTIONS = [10, 15, 20, 30, 45, 60, 90];
const ITEM = 56;

function speak(text: string) {
  try {
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/** 滚动选择器（类似滚轮），居中项为选中值 */
function Wheel(props: { options: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const i = Math.max(0, props.options.indexOf(props.value));
    if (ref.current) ref.current.scrollTop = i * ITEM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(props.options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
      props.onChange(props.options[i]);
    }, 120);
  };

  return (
    <div className="relative h-40 w-32 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-14 -translate-y-1/2 rounded-lg border-y border-accent/40" />
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll py-[64px]"
      >
        {props.options.map((o) => (
          <div
            key={o}
            className={
              "grid h-14 snap-center place-items-center text-base tabular-nums " +
              (o === props.value ? "font-semibold text-accent" : "text-muted")
            }
          >
            {label(o)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FollowAlong({ routine, onExit }: { routine: Routine; onExit: () => void }) {
  const [work, setWork] = useState(40);
  const [rest, setRest] = useState(20);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const endAt = useRef(0);
  const paused = useRef(0);

  const ids = useMemo(() => [...new Set(routine.blocks.flatMap((b) => b.exercises.map((e) => e.exerciseId)))], [routine]);
  const exercises = useLiveQuery(
    () =>
      ids.length
        ? db.exercises.bulkGet(ids).then((rows) => rows.filter((e): e is Exercise => !!e))
        : Promise.resolve([] as Exercise[]),
    [routine.id],
  );
  const byId = new Map((exercises ?? []).map((e) => [e.id, e]));

  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [];
    for (const block of routine.blocks) {
      for (const slot of block.exercises) {
        const ex = byId.get(slot.exerciseId);
        if (ex?.bodyPart === "cardio") {
          out.push({ kind: "work", exId: slot.exerciseId, setNo: 1, sets: 1, sec: slot.durationSec ?? 1200, cardio: true });
          out.push({ kind: "rest", sec: Math.max(10, rest) });
          continue;
        }
        for (let s = 1; s <= slot.sets; s++) {
          out.push({ kind: "work", exId: slot.exerciseId, setNo: s, sets: slot.sets, sec: work });
          out.push({ kind: "rest", sec: rest });
        }
      }
    }
    return out;
  }, [routine, work, rest, exercises]);

  const current = steps[idx];
  const next = steps.slice(idx + 1).find((s) => s.kind === "work");
  const totalMin = Math.round(steps.reduce((n, s) => n + s.sec, 0) / 60);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const ms = endAt.current - Date.now();
      if (ms <= 0) setIdx((i) => i + 1);
      else setLeft(Math.ceil(ms / 1000));
    }, 200);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!started) return;
    if (idx >= steps.length) {
      setDone(true);
      setRunning(false);
      speak("跟练完成");
      fireAlarm();
      return;
    }
    const step = steps[idx];
    endAt.current = Date.now() + step.sec * 1000;
    setLeft(step.sec);
    setRunning(true);
    if (step.kind === "work") {
      const name = exerciseLabel(byId.get(step.exId!));
      speak(step.cardio ? "开始 " + name + " " + label(step.sec) : "开始 " + name + " 第 " + step.setNo + " 组");
      fireAlarm();
    } else {
      speak("休息 " + step.sec + " 秒");
    }
  }, [idx, started, steps]);

  const exit = () => {
    try {
      speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    onExit();
  };

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg px-5 pb-8 pt-16">
        <div className="text-center">
          <div className="text-[12px] text-muted">跟练模式</div>
          <div className="mt-1 text-2xl font-semibold">{routine.name}</div>
        </div>

        <div className="mt-8 flex items-start justify-center gap-6">
          <div className="text-center">
            <div className="mb-2 text-[12px] text-muted">训练时长</div>
            <Wheel options={WORK_OPTIONS} value={work} onChange={setWork} />
          </div>
          <div className="text-center">
            <div className="mb-2 text-[12px] text-muted">组间休息</div>
            <Wheel options={REST_OPTIONS} value={rest} onChange={setRest} />
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] leading-6 text-muted">
          共 {steps.filter((s) => s.kind === "work").length} 段，预计 {totalMin} 分钟
          <br />
          有氧动作会自动使用计划里设置的时长
        </p>

        <button onClick={() => { setStarted(true); setIdx(0); }} className="press mt-auto w-full rounded-xl bg-accent py-4 text-base font-semibold text-onaccent">
          开始跟练
        </button>
        <button onClick={exit} className="press mt-2 w-full rounded-xl border border-line py-3.5 text-sm text-muted">
          退出
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg px-6">
        <div className="text-2xl font-semibold">跟练完成</div>
        <p className="text-sm text-muted">记得回「训练」记录实际重量与次数</p>
        <button onClick={exit} className="press mt-6 w-full max-w-xs rounded-xl bg-accent py-4 font-semibold text-onaccent">
          返回
        </button>
      </div>
    );
  }

  const name = current?.kind === "work" ? exerciseLabel(byId.get(current.exId!)) : "休息";
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg px-5 pb-6 pt-10">
      <div className="text-center text-[12px] text-muted">
        {idx + 1} / {steps.length}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-[13px] text-muted">
          {current?.cardio ? "有氧 · 计时完成" : current?.kind === "work" ? "第 " + current.setNo + " / " + current.sets + " 组" : "组间休息"}
        </div>
        <div className="mt-2 px-4 text-center text-3xl font-semibold leading-snug">{name}</div>
        <div className="mt-8 text-8xl font-bold tabular-nums">{fmt(left)}</div>
        {next && (
          <div className="mt-10 text-[12px] text-muted">
            下一个：{exerciseLabel(byId.get(next.exId!))} · 第 {next.setNo} 组
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2.5">
          <button onClick={() => { if (running) { paused.current = Math.max(0, endAt.current - Date.now()); setRunning(false); } else { endAt.current = Date.now() + paused.current; setRunning(true); } }} className="press h-14 flex-1 rounded-xl border border-line bg-surface text-base font-semibold">
            {running ? "暂停" : "继续"}
          </button>
          <button onClick={() => setIdx((i) => i + 1)} className="press h-14 flex-1 rounded-xl bg-accent text-base font-semibold text-onaccent">
            跳过
          </button>
        </div>
        <button onClick={exit} className="press h-12 w-full rounded-xl bg-surface2 text-sm text-muted">
          退出跟练
        </button>
      </div>
    </div>
  );
}
