import { describe, expect, it } from "vitest";
import { getReviews, ratingSummary, starKinds } from "./index";

describe("club de lectura", () => {
  it("solo hay reseñas de ejemplo para los libros con lectura", async () => {
    expect((await getReviews("el-principe-feliz")).length).toBeGreaterThan(0);
    expect((await getReviews("nahual")).length).toBeGreaterThan(0);
    expect(await getReviews("terregal")).toEqual([]);
  });

  it("calcula el promedio a la media estrella más cercana", () => {
    const r = (stars: number) => ({
      id: "x",
      user: "u",
      when: "",
      stars,
      text: "",
      helpful: 0,
      verified: true,
    });
    expect(ratingSummary([])).toEqual({ average: null, count: 0 });
    expect(ratingSummary([r(5), r(4)])).toEqual({ average: 4.5, count: 2 });
    expect(ratingSummary([r(5), r(5), r(4)])).toEqual({ average: 4.5, count: 3 });
    expect(ratingSummary([r(3), r(3), r(4)])).toEqual({ average: 3.5, count: 3 });
  });

  it("arma las 5 estrellas con medias", () => {
    expect(starKinds(4.5)).toEqual(["full", "full", "full", "full", "half"]);
    expect(starKinds(5)).toEqual(["full", "full", "full", "full", "full"]);
    expect(starKinds(0)).toEqual(["empty", "empty", "empty", "empty", "empty"]);
    expect(starKinds(2)).toEqual(["full", "full", "empty", "empty", "empty"]);
  });
});
