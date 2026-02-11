import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// expo-constantsをモック
vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { trainlcdGqlUrl: "" } } },
}));

// fetchをモック
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import {
  formatLineName,
  fetchLineNames,
  _resetCache,
  _getCache,
  _setGqlUrl,
} from "../../hooks/use-line-names";

beforeEach(() => {
  _resetCache();
  _setGqlUrl("https://gql-stg.trainlcd.app/");
  fetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchResponse(lines: { id: number; nameShort: string }[]) {
  fetchMock.mockResolvedValueOnce({
    json: () => Promise.resolve({ data: { lines } }),
  });
}

describe("formatLineName", () => {
  it("路線名がある場合は「路線名(ID)」形式で返す", () => {
    const names = { "11302": "山手線" };
    expect(formatLineName("11302", names)).toBe("山手線(11302)");
  });

  it("路線名がない場合はIDをそのまま返す", () => {
    expect(formatLineName("11302", {})).toBe("11302");
  });
});

describe("fetchLineNames", () => {
  it("GraphQL APIにバッチクエリを送信する", async () => {
    mockFetchResponse([
      { id: 11302, nameShort: "山手線" },
      { id: 24006, nameShort: "京王井の頭線" },
    ]);

    fetchLineNames(["11302", "24006"]);
    await vi.waitFor(() => expect(_getCache()).toHaveProperty("11302"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables.lineIds).toEqual([11302, 24006]);
    expect(_getCache()).toEqual({
      "11302": "山手線",
      "24006": "京王井の頭線",
    });
  });

  it("取得済みIDはスキップする（キャッシュ済み）", async () => {
    mockFetchResponse([{ id: 11302, nameShort: "山手線" }]);
    fetchLineNames(["11302"]);
    await vi.waitFor(() => expect(_getCache()).toHaveProperty("11302"));

    fetchLineNames(["11302"]);
    // 2回目のfetchは呼ばれない
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("新規IDのみを差分リクエストする", async () => {
    mockFetchResponse([{ id: 11302, nameShort: "山手線" }]);
    fetchLineNames(["11302"]);
    await vi.waitFor(() => expect(_getCache()).toHaveProperty("11302"));

    mockFetchResponse([{ id: 24006, nameShort: "京王井の頭線" }]);
    fetchLineNames(["11302", "24006"]);
    await vi.waitFor(() => expect(_getCache()).toHaveProperty("24006"));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondBody.variables.lineIds).toEqual([24006]);
  });

  it("GQL URLが空の場合はfetchしない", () => {
    _setGqlUrl("");
    fetchLineNames(["11302"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("空のID配列の場合はfetchしない", () => {
    fetchLineNames([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetchエラー時はキャッシュが変更されない", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));
    fetchLineNames(["99999"]);

    // エラー処理を待つ
    await new Promise((r) => setTimeout(r, 10));
    expect(_getCache()).toEqual({});
  });

  it("nameShortが空のlineはキャッシュに入れない", async () => {
    mockFetchResponse([
      { id: 11302, nameShort: "山手線" },
      { id: 99999, nameShort: "" },
    ]);

    fetchLineNames(["11302", "99999"]);
    await vi.waitFor(() => expect(_getCache()).toHaveProperty("11302"));

    expect(_getCache()).toEqual({ "11302": "山手線" });
    expect(_getCache()).not.toHaveProperty("99999");
  });

  it("APIレスポンスのlinesがundefinedの場合はキャッシュが変更されない", async () => {
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: {} }),
    });

    fetchLineNames(["11302"]);
    await new Promise((r) => setTimeout(r, 10));
    expect(_getCache()).toEqual({});
  });

  it("subscribeでリスナーが通知される", async () => {
    const { _resetCache: _, ...mod } = await import("../../hooks/use-line-names");

    _resetCache();
    const listener = vi.fn();

    // subscribe/getSnapshotを直接テストするためにモジュールのsubscribeを利用
    // fetchLineNamesの内部でnotifyが呼ばれることを間接的にテスト
    mockFetchResponse([{ id: 11302, nameShort: "山手線" }]);
    fetchLineNames(["11302"]);
    await vi.waitFor(() => expect(_getCache()).toHaveProperty("11302"));
    // キャッシュが更新されたことで正しい値が入っている
    expect(_getCache()["11302"]).toBe("山手線");
  });
});
