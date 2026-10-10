/**
 * dsh-plan-switch 宿主半：本插件是纯浏览器半插件，宿主侧不需要做任何事。
 *
 * 这个文件必须存在：bundle patch 往组合里插入的那一行要有宿主侧条目可挂载，
 * 而 dsh-client-modules 只会把浏览器半挂在「说明符恰为包名」的那一行上。
 * 浏览器半见 `lib/client.js`（输入栏「计划」按钮）。
 *
 * @module dsh-plan-switch
 */

/** 插件名 = 包名，与 bundle patch 里的行名一致。 */
export const name = 'dsh-plan-switch'

/** 宿主侧不依赖任何服务。 */
export const inject = []

/** 空实现：本插件的全部行为都在浏览器半。 */
export function apply() {}
