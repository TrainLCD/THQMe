import { describe, it, expect } from "vitest";
import { getContrastRatio } from "../utils";

describe("getContrastRatio", () => {
  it("黒と白のコントラスト比は21:1", () => {
    expect(getContrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("同色のコントラスト比は1:1", () => {
    expect(getContrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("山手線(#80C241)は白背景でWCAG AA基準(4.5:1)を下回る", () => {
    // ~2.16:1
    expect(getContrastRatio("#80C241", "#FFFFFF")).toBeLessThan(4.5);
  });

  it("京王井の頭線(#DD0077)は白背景でWCAG AA基準を満たす", () => {
    // ~4.85:1
    expect(getContrastRatio("#DD0077", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("#プレフィックスなしの色も扱える", () => {
    expect(getContrastRatio("000000", "FFFFFF")).toBeCloseTo(21, 0);
  });

  it("引数の順序に関わらず同じ比率を返す", () => {
    const ratio1 = getContrastRatio("#80C241", "#FFFFFF");
    const ratio2 = getContrastRatio("#FFFFFF", "#80C241");
    expect(ratio1).toBeCloseTo(ratio2, 10);
  });

  it("ダークモード背景(#1E293B)に対するDD0077はWCAG AA基準を下回る", () => {
    // ~3.02:1
    expect(getContrastRatio("#DD0077", "#1E293B")).toBeLessThan(4.5);
  });

  it("ダークモード前景(#F1F5F9)は暗い背景に対して十分なコントラストを持つ", () => {
    expect(getContrastRatio("#F1F5F9", "#1E293B")).toBeGreaterThanOrEqual(4.5);
  });
});
