import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, exerciseLabel, type Exercise, type Routine } from "../lib/db";
import { fireAlarm } from "../lib/rest";
import { Chip } from "../components/ui";

interface Step {
  kind: "work" | "rest";
  exId?: string;
  setNo?: number;
  sets?: number;
  sec: number;
}

const fmt = (s: number) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");

function speak(text: string) {
  try {
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch {
    /* 不支持就静默 */
  }
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
        for (let s = 1; s <= slot.sets; s++) {
          out.push({ kind: "work", exId: slot.exerciseId, setNo: s, sets: slot.sets, sec: work });
          out.push({ kind: "rest", sec: rest });
        }
      }
    }
    return out;
  }, [routine, work, rest]);

  const current = steps[idx];
  const next = steps.slice(idx + 1).find((s) => s.kind === "work");

  // 计时
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const ms = endAt.current - Date.now();
      if (ms <= 0) {
        setIdx((i) => i + 1);
      } else {
        setLeft(Math.ceil(ms / 1000));
      }
    }, 200);
    return () => clearInterval(t);
  }, [running]);

  // 切换步骤
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
      const name = exerciseLabel(byId.get(step.exId!) );
      speak("开始 " + name + " 第 " + step.setNo + " 组");
      fireAlarm();
    } else {
      speak("休息 " + step.sec + " 秒");
    }
  }, [idx, started, steps]);

  const start = () => {
    setStarted(true);
    setIdx(0);
  };

  const toggle = () => {
    if (running) {
      paused.current = Math.max(0, endAt.current - Date.now());
      setRunning(false);
    } else {
      endAt.current = Date.now() + paused.current;
      setRunning(true);
    }
  };

  const skip = () => setIdx((i) => i + 1);

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg px-5 pb-8 pt-6">
        <div className="flex items-center justify-between">
          <button onClick={onExit} className="text-sm text-muted">返回</button>
          <span className="text-sm font-semibold">跟练模式</span>
          <span className="w-8" />
        </div>
        <div className="mt-8 text-[12px] text-muted">例程</div>
        <div className="text-xl font-semibold">{routine.name}</div>
        <div className="mt-6 space-y-4">
          <div>
            <div className="mb-1.5 text-[12px] text-muted">训练时长</div>
            <div className="flex gap-2">
              {[30, 40, 45, 60].map((s) => (
                <Chip key={s} active={work === s} onClick={() => setWork(s)}>{s} 秒</Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[12px] text-muted">组间休息</div>
            <div className="flex gap-2">
              {[10, 20, 30, 45].map((s) => (
                <Chip key={s} active={rest === s} onClick={() => setRest(s)}>{s} 秒</Chip>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-6 text-[12px] text-muted">
          共 {steps.filter((s) => s.kind === "work").length} 组，预计{" "}
          {Math.round(steps.reduce((n, s) => n + s.sec, 0) / 60)} 分钟。会语音提示开始与休息。
        </p>
        <button onClick={start} className="press mt-auto w-full rounded-xl bg-accent py-4 text-base font-semibold text-onaccent">
          开始跟练
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg px-6">
        <div className="text-2xl font-semibold">跟练完成</div>
        <p className="text-sm text-muted">记得在「训练」里记录实际重量与次数</p>
        <button onClick={onExit} className="press mt-4 w-full max-w-xs rounded-xl bg-accent py-3.5 font-semibold text-onaccent">
          返回
        </button>
      </div>
    );
  }

  const name = current?.kind === "work" ? exerciseLabel(byId.get(current.exId!)) : "休息";
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-muted">退出</button>
        <span className="text-sm font-semibold">{idx + 1} / {steps.length}</span>
        <span className="w-8" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-[12px] text-muted">
          {current?.kind === "work" ? "第 " + current.setNo + " / " + current.sets + " 组" : "组间休息"}
        </div>
        <div className="mt-1 text-3xl font-semibold">{name}</div>
        <div className="mt-6 text-7xl font-bold tabular-nums">{fmt(left)}</div>
        {next && (
          <div className="mt-8 text-[12px] text-muted">
            下一个：{exerciseLabel(byId.get(next.exId!))} · 第 {next.setNo} 组
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={toggle} className="press flex-1 rounded-xl border border-line bg-surface py-4 text-sm font-semibold">
          {running ? "暂停" : "继续"}
        </button>
        <button onClick={skip} className="press flex-1 rounded-xl bg-accent py-4 text-sm font-semibold text-onaccent">
          跳过
        </button>
      </div>
    </div>
  );
}
