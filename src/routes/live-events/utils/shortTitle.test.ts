import { describe, expect, it } from "vitest";
import { shortTitle } from "./shortTitle.ts";

describe("shortTitle", () => {
  it("takes the opening mark and the closing shad off", () => {
    expect(shortTitle("༄༅། །སྒྲོལ་མ་ཉེར་གཅིག་ལ་བསྟོད་པ།")).toBe(
      "སྒྲོལ་མ་ཉེར་གཅིག་ལ་བསྟོད་པ",
    );
  });

  it("takes off herein contained", () => {
    expect(
      shortTitle(
        "༄༅། །དགོངས་གཏེར་སྒྲོལ་མའི་བརྒྱུད་འདེབས་ཨུཏྤ་ལའི་ཕྲེང་བ་བཞུགས་སོ། །",
      ),
    ).toBe("དགོངས་གཏེར་སྒྲོལ་མའི་བརྒྱུད་འདེབས་ཨུཏྤ་ལའི་ཕྲེང་བ");
  });

  it("takes off called and herein contained together, in either spelling", () => {
    expect(
      shortTitle(
        "༄༅། །རྗེ་བཙུན་སྒྲོལ་མ་ལ་བསྔགས་པ་འདོད་དོན་འགྲུབ་པའི་ཤིས་བརྗོད་ཅེས་བྱ་བ་བཞུགས་སོ། །",
      ),
    ).toBe("རྗེ་བཙུན་སྒྲོལ་མ་ལ་བསྔགས་པ་འདོད་དོན་འགྲུབ་པའི་ཤིས་བརྗོད");
  });

  it("drops the cycle a text is taken from", () => {
    expect(
      shortTitle(
        "༄༅། །དགོངས་གཏེར་སྒྲོལ་མའི་ཟབ་ཏིག་ལས། མཎྜལ་ཆོ་ག་ཚོགས་གཉིས་སྙིང་པོ་ཞེས་བྱ་བ་བཞུགས་སོ། །",
      ),
    ).toBe("མཎྜལ་ཆོ་ག་ཚོགས་གཉིས་སྙིང་པོ");
  });

  it("takes the section mark and a closing topic marker off", () => {
    expect(shortTitle("༈ རྗེ་བཙུན་སྒྲོལ་མའི་གསོལ་འདེབས་ནི།")).toBe(
      "རྗེ་བཙུན་སྒྲོལ་མའི་གསོལ་འདེབས",
    );
    expect(shortTitle("༈ ཇ་མཆོད།")).toBe("ཇ་མཆོད");
  });

  it("does not read activity as from", () => {
    expect(shortTitle("བླ་མའི་ཕྲིན་ལས། བསྟོད་པ།")).toBe(
      "བླ་མའི་ཕྲིན་ལས། བསྟོད་པ",
    );
  });

  it("leaves a title without the formula as it was", () => {
    expect(shortTitle("མཚན་དོན་དང་འགྱུར་ཕྱག")).toBe("མཚན་དོན་དང་འགྱུར་ཕྱག");
    expect(shortTitle("  Praises to the Twenty-One Tārās ")).toBe(
      "Praises to the Twenty-One Tārās",
    );
  });

  it("keeps a title that is nothing but formula", () => {
    expect(shortTitle("བཞུགས་སོ། །")).toBe("བཞུགས་སོ། །");
    expect(shortTitle(null)).toBe("");
  });
});
