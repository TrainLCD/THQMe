import { useEffect, useSyncExternalStore } from "react";
import Constants from "expo-constants";

let gqlUrl = Constants.expoConfig?.extra?.trainlcdGqlUrl || "";

// モジュールレベルのキャッシュ（アプリ全体で共有）
let cache: Record<string, string> = {};
let colorCache: Record<string, string> = {};
const resolvedIds = new Set<string>(); // 取得成功済みのID
const pendingIds = new Set<string>(); // 取得中のID（重複リクエスト防止）
const listeners = new Set<() => void>();

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // 指数バックオフ（ms）

function getSnapshot(): Record<string, string> {
  return cache;
}

function getColorSnapshot(): Record<string, string> {
  return colorCache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const l of listeners) l();
}

export function fetchLineNames(ids: string[], _retryCount = 0) {
  const newIds = ids.filter((id) => !resolvedIds.has(id) && !pendingIds.has(id));
  if (newIds.length === 0 || !gqlUrl) return;

  for (const id of newIds) pendingIds.add(id);

  fetch(gqlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query Lines($lineIds: [Int!]!) { lines(lineIds: $lineIds) { id nameShort color } }`,
      variables: { lineIds: newIds.map(Number) },
    }),
  })
    .then((res) => res.json())
    .then((json) => {
      const lines = json?.data?.lines as
        | { id: number; nameShort: string; color: string | null }[]
        | undefined;
      if (!lines) {
        // レスポンスにlinesがない場合もリトライ対象
        throw new Error("No lines data in response");
      }
      let updated = false;
      const nextNames = { ...cache };
      const nextColors = { ...colorCache };
      for (const line of lines) {
        if (line.nameShort) {
          nextNames[String(line.id)] = line.nameShort;
          updated = true;
        }
        if (line.color) {
          nextColors[String(line.id)] = line.color.startsWith("#") ? line.color : `#${line.color}`;
          updated = true;
        }
      }
      // 取得成功: resolvedIdsに追加してpendingIdsから削除
      for (const id of newIds) {
        resolvedIds.add(id);
        pendingIds.delete(id);
      }
      if (updated) {
        cache = nextNames;
        colorCache = nextColors;
        notify();
      }
    })
    .catch(() => {
      // 取得失敗: pendingIdsから削除してリトライ
      for (const id of newIds) pendingIds.delete(id);
      if (_retryCount < MAX_RETRIES) {
        setTimeout(() => {
          fetchLineNames(newIds, _retryCount + 1);
        }, RETRY_DELAYS[_retryCount]);
      }
    });
}

export function useLineNames(lineIds: string[]): Record<string, string> {
  const lineNames = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    fetchLineNames(lineIds);
  }, [lineIds]);

  return lineNames;
}

export function useLineColors(lineIds: string[]): Record<string, string> {
  const lineColors = useSyncExternalStore(subscribe, getColorSnapshot, getColorSnapshot);

  useEffect(() => {
    fetchLineNames(lineIds);
  }, [lineIds]);

  return lineColors;
}

export function formatLineName(
  lineId: string,
  lineNames: Record<string, string>
): string {
  const name = lineNames[lineId];
  return name ? `${name}(${lineId})` : lineId;
}

/** テスト用: キャッシュとID管理をリセット */
export function _resetCache() {
  cache = {};
  colorCache = {};
  resolvedIds.clear();
  pendingIds.clear();
  listeners.clear();
}

/** テスト用: 現在のキャッシュを返す */
export function _getCache(): Record<string, string> {
  return cache;
}

/** テスト用: 現在のカラーキャッシュを返す */
export function _getColorCache(): Record<string, string> {
  return colorCache;
}

/** テスト用: GQL URLを上書き */
export function _setGqlUrl(url: string) {
  gqlUrl = url;
}
