type Handler = () => boolean;

const stack: Handler[] = [];

/** 注册「返回键优先关闭」的处理（弹层/详情页），返回注销函数。 */
export function pushBack(handler: Handler) {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

export function runBack(): boolean {
  const handler = stack[stack.length - 1];
  if (!handler) return false;
  const consumed = handler();
  if (consumed) stack.pop();
  return consumed;
}
