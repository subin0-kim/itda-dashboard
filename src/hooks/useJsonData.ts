import { useEffect, useState } from "react";
import type { DataLoadState } from "../types/data";

export function useJsonData<T>(path: string): DataLoadState<T> {
  const [state, setState] = useState<DataLoadState<T>>({
    status: "idle",
    data: null,
    error: null,
    path,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null, path });

    fetch(path, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          setState({ status: "missing", data: null, error: `파일이 없습니다: ${path}`, path });
          return;
        }
        if (!response.ok) {
          setState({ status: "error", data: null, error: `데이터를 불러올 수 없음: ${path}`, path });
          return;
        }
        const data = (await response.json()) as T;
        setState({ status: "success", data, error: null, path });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "데이터를 불러올 수 없음",
          path,
        });
      });

    return () => controller.abort();
  }, [path]);

  return state;
}
