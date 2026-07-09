// 编译时类型检查：确保你定义的 Type 跟接口真实返回的结构兼容
// 这个文件本身不产生运行时代码，只用于让 tsc 编译器校验

import type { TyphoonListItem } from "../../types/typhoon";

// 如果这个函数的参数能通过 TypeScript 编译，说明类型定义匹配
function validateListItem(item: TyphoonListItem): string {
  return `${item.id} ${item.name}(${item.enName}) active=${item.active}`;
}

// 模拟一条真实数据（来自实测的 JSON）
const realItem: TyphoonListItem = {
  id: "202609",
  name: "巴威",
  enName: "BAVI",
  active: true,
  startTime: "2026-07-02 08:00:00",
  endTime: "2026-07-09 08:00:00",
};

// 这行如果编译通过 = 类型匹配真实数据
validateListItem(realItem);
