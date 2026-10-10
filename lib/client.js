window.__ModuleLoader__.load({
  id: "dsh-plan-switch",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");

    const inject = ["slots", "remote", "remote.commands"];

    /**
     * 候选 priority（越小越优先渲染）。
     *
     * `conversation.input.plan` 是 single 槽位：SlotRegistry 对同一 priority 只允许
     * 一个注册者，第二个注册者会**抛错**：
     *   single slot "…" already has a registration at priority 0 — register at a
     *   different priority to shadow it (lowest renders)
     * 官方 @deepseek-ai/dsh-client-ui-plan 以默认 priority 0 注册该座位，因此本插件
     * 必须用更低（负数）的 priority 才能"影子替换"：既顶掉官方圆片，又不让官方插件
     * 注册失败。阶梯用于极端情况（未来官方/第三方也占用负数 priority）继续降级；
     * 全部失败时放弃落座，绝不把异常抛出去。
     */
    const PLAN_SEAT_PRIORITIES = [-1, -2, -3, -5, -8];

    if (typeof document !== "undefined" && !document.getElementById("dsh-plan-switch-style")) {
      const style = document.createElement("style");
      style.id = "dsh-plan-switch-style";
      style.textContent = [
        ".dps-wrap{display:inline-flex;align-items:center;vertical-align:middle;}",
        ".dps-btn{min-width:0;max-width:140px;height:28px;border-radius:var(--dsw-radius-sm,6px);font-size:13px;font-weight:500;line-height:20px;display:inline-flex;align-items:center;gap:4px;padding:0 8px;border:none;cursor:pointer;outline:none;user-select:none;transition:background-color .15s,color .15s;}",
        /* 未开启态：与工作区修改等按钮保持一致的外观 */
        ".dps-btn-off{background:transparent;color:var(--dsw-alias-label-secondary);}",
        ".dps-btn-off:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);}",
        ".dps-btn-off:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));}",
        /* 开启态：原生 business 高亮胶囊样式 */
        ".dps-btn-on{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary);}",
        ".dps-btn-on:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-tertiary),var(--dsw-alias-state-business-primary) 6%);}",
        ".dps-btn-on:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;}",
        /* 通用禁用 */
        ".dps-btn:disabled{color:var(--dsw-alias-label-dimmed);opacity:.6;cursor:default;}",
        /* 图标与文本 */
        ".dps-icon{flex:none;width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;}",
        ".dps-icon svg{width:14px;height:14px;display:block;}",
        ".dps-label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden;}",
        ".dps-closeIcon{flex:none;width:14px;height:14px;display:none;}",
        ".dps-closeIcon svg{width:14px;height:14px;display:block;}",
        ".dps-btn-on:hover:not(:disabled) .dps-closeIcon,.dps-btn-on:focus-visible .dps-closeIcon{display:inline-flex;}",
        ".dps-error{color:var(--dsw-alias-state-error-primary,#d03050);font-size:11px;margin-left:4px;}"
      ].join("\n");
      document.head.appendChild(style);
    }

    // 内联 SVG 图标：IconPlanOutline（未开启态）
    function PlanIcon() {
      return react.createElement(
        "svg",
        {
          viewBox: "0 0 16 16",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg",
          "aria-hidden": "true",
          strokeWidth: "1"
        },
        react.createElement("path", { d: "M4.9375 5.90295H11.0625", stroke: "currentColor" }),
        react.createElement("path", { d: "M4.9375 9.02991H8.27841", stroke: "currentColor" }),
        react.createElement("path", {
          d: "M12.5 1.32617C13.3039 1.32617 14 1.95171 14 2.77637V7.61328L13 8.68164V2.77637C13 2.55186 12.8007 2.32617 12.5 2.32617H3.5C3.1993 2.32617 3 2.55186 3 2.77637V13.2246C3.00044 13.4489 3.19963 13.6738 3.5 13.6738H8.32812L7.39258 14.6738H3.5C2.69637 14.6738 2.00042 14.0489 2 13.2246V2.77637C2 1.95171 2.69613 1.32617 3.5 1.32617H12.5Z",
          fill: "currentColor"
        }),
        react.createElement("path", {
          d: "M8.97212 14.3693C9.17511 14.5723 9.37811 14.7753 9.5811 14.9783C9.67012 14.8953 9.75914 14.8123 9.84815 14.7293C11.4505 13.2352 13.0528 11.7411 14.6551 10.247C14.7441 10.164 14.8331 10.081 14.9221 9.99803C14.5989 9.6748 14.2756 9.35157 13.9524 9.02834C13.8694 9.11736 13.7864 9.20637 13.7034 9.29539C12.2093 10.8977 10.7152 12.5 9.22113 14.1023C9.13813 14.1913 9.05513 14.2803 8.97212 14.3693Z",
          fill: "currentColor"
        }),
        react.createElement("path", {
          d: "M11.6323 13.7841C11.6323 14.0395 11.6323 14.295 11.6323 14.5504C11.6812 14.5523 11.7301 14.5543 11.779 14.5562C12.659 14.5913 13.539 14.6263 14.419 14.6614C14.4679 14.6633 14.5168 14.6653 14.5657 14.6672C14.5657 14.3339 14.5657 14.0005 14.5657 13.6672C14.5422 13.6653 14.5186 13.6633 14.4951 13.6614C13.6151 13.6263 12.7351 13.5913 11.8551 13.5562C11.8062 13.5543 11.7573 13.5523 11.7084 13.5504C11.683 13.6283 11.6577 13.7062 11.6323 13.7841Z",
          fill: "currentColor"
        })
      );
    }

    // 内联 SVG 图标：IconCloseCircleFill（已开启态悬浮时显示）
    function CloseIcon() {
      return react.createElement(
        "svg",
        {
          viewBox: "0 0 16 16",
          fill: "none",
          xmlns: "http://www.w3.org/2000/svg",
          "aria-hidden": "true"
        },
        react.createElement("path", {
          fillRule: "evenodd",
          clipRule: "evenodd",
          d: "M15 8A7 7 0 1 1 1 8A7 7 0 1 1 15 8ZM6.409 10.652L5.348 9.591L6.939 8L5.348 6.409L6.409 5.348L8 6.939L9.591 5.348L10.652 6.409L9.061 8L10.652 9.591L9.591 10.652L8 9.061Z",
          fill: "currentColor"
        })
      );
    }

    async function runCommand(ctx, sessionId, line) {
      if (!ctx.remote || !ctx.remote.commands || typeof ctx.remote.commands.execute !== "function") {
        throw new Error("remote commands service unavailable");
      }
      try {
        return await ctx.remote.commands.execute(sessionId, line, []);
      } catch (err) {
        // 兼容旧版两参数调用
        return await ctx.remote.commands.execute(sessionId, line);
      }
    }

    /** 占用冲突（同 priority 已被注册）的判定——只有这种错误才值得降级重试。 */
    function isSeatConflict(error) {
      const message = error instanceof Error ? error.message : String(error);
      return /already has a registration|already has an entry/.test(message);
    }

    /**
     * 在 single 槽位 `conversation.input.plan` 上落座，返回 disposer。
     *
     * 关键纪律：任何失败都就地吞掉并降级，**绝不把异常抛出 apply** —— 静态客户端插件
     * 的 apply/effect 抛错会让该 entry 变成 "failed"，桌面端随即以
     * "web boot: N entry did not activate" 判定启动失败（表现为客户端打不开）。
     * 最坏情况只是本按钮不出现，官方 UI 必须照常启动。
     */
    function seatPlanControl(ctx, component) {
      for (const priority of PLAN_SEAT_PRIORITIES) {
        try {
          const dispose = ctx.slots.register(
            { name: "conversation.input.plan", id: "dsh-plan-switch", priority },
            component
          );
          return typeof dispose === "function" ? dispose : () => {};
        } catch (error) {
          if (!isSeatConflict(error)) {
            console.warn("[dsh-plan-switch] 计划按钮落座失败：", error);
            return () => {};
          }
        }
      }
      console.warn("[dsh-plan-switch] 计划按钮无法落座：候选 priority 全部被占用，已跳过（不影响宿主启动）。");
      return () => {};
    }

    /** 组件工厂：把 ctx 收进闭包，注册出去的只是组件本身。 */
    function makePlanButton(ctx) {
      return function PlanButton(props) {
        const plan = typeof props.useProjection === "function" ? props.useProjection("plan") : undefined;
        const [busy, setBusy] = react.useState(false);
        const [error, setError] = react.useState(null);
        const sessionId = props.sessionId;

        // 官方折叠状态算法
        const active = plan ? (plan.pending ? !plan.active : plan.active) : false;
        const pending = plan ? plan.pending === true : false;
        const locked = props.locked === true;

        const toggle = () => {
          if (busy || pending || locked || !sessionId) return;
          setBusy(true);
          setError(null);
          const line = active ? "/plan off" : "/plan";
          runCommand(ctx, sessionId, line).then((result) => {
            if (result && !result.ok) {
              setError(result.error ? (result.error.message || result.error.code) : "命令执行失败");
            }
          }, (reason) => {
            setError(reason instanceof Error ? reason.message : String(reason));
          }).finally(() => {
            setBusy(false);
          });
        };

        const title = active
          ? "计划模式已开启 — 点击关闭（/plan off）"
          : "计划模式未开启 — 点击开启（/plan）";

        return react.createElement(
          "span",
          { className: "dps-wrap" },
          react.createElement(
            "button",
            {
              type: "button",
              className: "dps-btn " + (active ? "dps-btn-on" : "dps-btn-off"),
              "aria-pressed": active,
              "aria-label": title,
              title: error || title,
              disabled: busy || pending || locked,
              onClick: toggle,
            },
            react.createElement("span", { className: "dps-icon" }, react.createElement(PlanIcon, null)),
            react.createElement("span", { className: "dps-label" }, "计划"),
            active && react.createElement("span", { className: "dps-closeIcon" }, react.createElement(CloseIcon, null))
          ),
          error && react.createElement("span", { className: "dps-error", role: "status" }, "失败")
        );
      };
    }

    function apply(ctx) {
      ctx.slots.inject("conversation.input.plan", () => seatPlanControl(ctx, makePlanButton(ctx)));
    }

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  }
});
