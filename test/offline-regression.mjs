// dsh-plan-switch 离线回归：single 槽位影子替换 + /plan 命令通道 + 按钮状态机。
//
// 跑法：node test/offline-regression.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createChecker, createSlotsCore, declareComposerSeats, loadClientPlugin, makeSlots, mount } from "./harness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const plugin = loadClientPlugin(path.join(here, "..", "lib", "client.js"));
const { check, report } = createChecker();

/** 让 toggle 里的 promise 链结算。 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** 造一个可交互的夹具。 */
function mountButton({ result = { ok: true } } = {}) {
  const core = createSlotsCore();
  declareComposerSeats(core);
  const calls = [];
  const ctx = {
    slots: makeSlots(core),
    remote: {
      commands: {
        execute: async (sessionId, line, images) => { calls.push({ sessionId, line, images }); return result; },
      },
    },
  };
  plugin.apply(ctx);

  const component = core.entries("conversation.input.plan")[0].component;
  let plan = { active: false, pending: false };
  const props = () => ({
    sessionId: "session-1",
    locked: false,
    useProjection: (key) => (key === "plan" ? plan : undefined),
  });

  let fixture = mount(plugin.react, component, props());
  const button = () => fixture.element.children[0];
  return {
    core,
    get calls() { return calls; },
    get pressed() { return button().props["aria-pressed"] === true; },
    get disabled() { return button().props.disabled === true; },
    get label() { return button().children[1].children[0]; },
    get errorShown() { return fixture.element.children[1] !== false && fixture.element.children[1] !== undefined; },
    async click() { button().props.onClick(); await settle(); fixture.setProps({}); },
    setPlan(next) { plan = next; fixture.setProps({}); },
    props,
  };
}

// ── 1. 依赖面 ──
{
  console.log("\n1. 依赖面");
  check("inject = [slots, remote, remote.commands]",
    JSON.stringify(plugin.inject) === JSON.stringify(["slots", "remote", "remote.commands"]));
}

// ── 2. 官方先注册 priority 0，本插件后注册 ──
{
  console.log("\n2. 官方 ui-plan 先注册");
  const core = createSlotsCore();
  declareComposerSeats(core);
  core.register({ name: "conversation.input.plan" }, "OFFICIAL_PLAN_CHIP");
  let threw = null;
  try {
    plugin.apply({ slots: makeSlots(core), remote: { commands: { execute: async () => ({ ok: true }) } } });
  } catch (error) { threw = error; }
  check("apply 未抛错", threw === null);
  const entries = core.entries("conversation.input.plan");
  check("官方条目仍在台账中（没有被踢掉）", entries.length === 2);
  check("渲染的是我们的按钮（priority -1 低于官方 0）",
    typeof entries[0].component === "function" && entries[0].component !== "OFFICIAL_PLAN_CHIP");
}

// ── 3. 本插件先注册，官方后注册（曾经让桌面端起不来的顺序） ──
{
  console.log("\n3. 本插件先注册，官方后注册");
  const core = createSlotsCore();
  declareComposerSeats(core);
  let threw = null;
  try {
    plugin.apply({ slots: makeSlots(core), remote: { commands: { execute: async () => ({ ok: true }) } } });
  } catch (error) { threw = error; }
  check("本插件 apply 未抛错", threw === null);

  let officialError = null;
  try { core.register({ name: "conversation.input.plan" }, "OFFICIAL_PLAN_CHIP"); } catch (error) { officialError = error.message; }
  check("官方插件随后注册成功（不会 failed、不会拖垮启动）", officialError === null);
  check("渲染的仍是我们的按钮", core.entries("conversation.input.plan")[0].component !== "OFFICIAL_PLAN_CHIP");
}

// ── 4. priority -1 被占 → 自动降级 ──
{
  console.log("\n4. priority -1 被占时降级");
  const core = createSlotsCore();
  declareComposerSeats(core);
  core.register({ name: "conversation.input.plan", priority: -1 }, "RIVAL_AT_MINUS_1");
  let threw = null;
  try {
    plugin.apply({ slots: makeSlots(core), remote: { commands: { execute: async () => ({ ok: true }) } } });
  } catch (error) { threw = error; }
  check("apply 未抛错", threw === null);
  check("降级落座成功（台账 2 条）", core.entries("conversation.input.plan").length === 2);
  check("渲染的仍是我们的按钮", typeof core.entries("conversation.input.plan")[0].component === "function");
}

// ── 5. 阶梯全被占 → 放弃落座但不抛错 ──
{
  console.log("\n5. priority 阶梯全被占");
  const core = createSlotsCore();
  declareComposerSeats(core);
  for (const priority of [-1, -2, -3, -5, -8]) core.register({ name: "conversation.input.plan", priority }, "RIVAL_" + priority);
  let threw = null;
  try {
    plugin.apply({ slots: makeSlots(core), remote: { commands: { execute: async () => ({ ok: true }) } } });
  } catch (error) { threw = error; }
  check("apply 未抛错（最坏只是按钮不出现）", threw === null);
  check("没有抢占别人的格子（台账仍 5 条）", core.entries("conversation.input.plan").length === 5);
}

// ── 6. 槽位未声明 → 静默失败 ──
{
  console.log("\n6. 槽位未声明");
  const core = createSlotsCore();
  let threw = null;
  try {
    plugin.apply({ slots: makeSlots(core), remote: { commands: { execute: async () => ({ ok: true }) } } });
  } catch (error) { threw = error; }
  check("apply 未抛错（最坏只是按钮不出现）", threw === null);
}

// ── 7. 按钮状态机与命令通道 ──
{
  console.log("\n7. 按钮状态机");
  const f = mountButton();
  check("未开启时 aria-pressed = false", f.pressed === false);
  check("未开启时文案为「计划」", f.label === "计划");

  await f.click();
  check("点击发出 /plan", f.calls.length === 1 && f.calls[0].line === "/plan");
  check("命令带 sessionId", f.calls[0].sessionId === "session-1");

  f.setPlan({ active: true, pending: false });
  check("projection 说开启后按钮高亮", f.pressed === true);

  await f.click();
  check("再次点击发出 /plan off", f.calls.length === 2 && f.calls[1].line === "/plan off");
}

// ── 8. pending 时禁用（防止"退出排队中再点反而进入"） ──
{
  console.log("\n8. pending 时禁用");
  const f = mountButton();
  f.setPlan({ active: false, pending: true });
  check("pending 时按钮禁用", f.disabled === true);
  await f.click();
  check("pending 时点击不发命令", f.calls.length === 0);

  // 官方折叠状态算法：pending 时显示目标值（!active）
  f.setPlan({ active: true, pending: true });
  check("pending 时按官方算法显示目标值（active=true → 目标关闭）", f.pressed === false);
}

// ── 9. 命令失败 → 就地报错，不抛错、不卡住 ──
{
  console.log("\n9. 命令失败");
  const f = mountButton({ result: { ok: false, error: { message: "命令执行失败" } } });
  await f.click();
  check("失败后按钮恢复可用（busy 已复位）", f.disabled === false);
  check("失败信息渲染出来", f.errorShown === true);
}

// ── 10. 缺 props 兜底 ──
{
  console.log("\n10. props 缺失兜底");
  const core = createSlotsCore();
  declareComposerSeats(core);
  plugin.apply({ slots: makeSlots(core), remote: { commands: { execute: async () => ({ ok: true }) } } });
  const component = core.entries("conversation.input.plan")[0].component;

  let threw = null;
  try { plugin.react.__mount(component, { sessionId: undefined, locked: false }); } catch (error) { threw = error; }
  check("无 sessionId / 无 useProjection 渲染不抛错", threw === null);

  const element = plugin.react.__mount(component, { sessionId: "s2", locked: false });
  let clickThrew = null;
  try { element.children[0].props.onClick(); } catch (error) { clickThrew = error; }
  check("缺 useProjection 时点击不抛错", clickThrew === null);
}

// ── 11. remote 缺失时也不崩（未来宿主改名） ──
{
  console.log("\n11. remote 缺失");
  const core = createSlotsCore();
  declareComposerSeats(core);
  let threw = null;
  try { plugin.apply({ slots: makeSlots(core) }); } catch (error) { threw = error; }
  check("完全没有 remote 时 apply 未抛错", threw === null);

  const component = core.entries("conversation.input.plan")[0].component;
  const element = plugin.react.__mount(component, {
    sessionId: "s3",
    locked: false,
    useProjection: () => ({ active: false, pending: false }),
  });
  let clickThrew = null;
  try { element.children[0].props.onClick(); } catch (error) { clickThrew = error; }
  check("remote 缺失时点击不抛错（走 catch 分支）", clickThrew === null);
}

report();
