import type { TyphoonListItem } from "../types/typhoon";

// 原始浙江源列表项
interface RawListItem {
  tfid: string;
  name: string;
  enname: string;
  starttime: string;
  endtime: string;
  isactive: string;
}

const normalize = (item: RawListItem): TyphoonListItem => {
  return {
    id: item.tfid,
    name: item.name,
    enName: item.enname,
    active: item.isactive === "1",
    startTime: item.starttime,
    endTime: item.endtime,
  };
};

export const fetchTyphoonList = async (
  year: number,
): Promise<TyphoonListItem[]> => {
  const res = await fetch(`/api/typhoon/list/${year}`);
  if (!res.ok) throw new Error(`列表请求失败: ${res.status}`);
  const raw: RawListItem[] = await res.json();
  return raw.map(normalize);
};
