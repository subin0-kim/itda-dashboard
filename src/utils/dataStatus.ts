import type { DataLoadState } from "../types/data";

export function isDataReady<T>(state: DataLoadState<T>): state is DataLoadState<T> & { data: T } {
  return state.status === "success" && state.data !== null;
}

export function getDataStatusMessage<T>(state: DataLoadState<T>): string {
  if (state.status === "missing") {
    return `데이터 준비 필요: ${state.path}`;
  }
  if (state.status === "error") {
    return state.error ?? "데이터를 불러올 수 없음";
  }
  if (state.status === "loading") {
    return "데이터를 불러오는 중입니다.";
  }
  return "데이터 준비 필요";
}
