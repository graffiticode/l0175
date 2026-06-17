// SPDX-License-Identifier: MIT
// EBSR (Task Model 1): two-part evidence-based selected response. Part A = inference
// statement (4 options); Part B = supporting line (4 options). Both correct = 1 point.
import { useState } from "react";
import { OptionRow, StemLine, analysisIndex, type Mode } from "./itemKit";

export function EbsrItem({
  item,
  mode,
  respond,
}: {
  item: any;
  mode: Mode;
  respond: (r: any) => void;
}) {
  const [partA, setPartA] = useState<string | undefined>();
  const [partB, setPartB] = useState<string | undefined>();
  const ax = analysisIndex(item);

  const pick = (part: "A" | "B", key: string) => {
    if (part === "A") setPartA(key);
    else setPartB(key);
    respond({ partA: part === "A" ? key : partA, partB: part === "B" ? key : partB });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <StemLine>Part A. {item.stem.partA}</StemLine>
        {item.partA.options.map((o: any) => (
          <OptionRow
            key={o.key}
            name={`${item.id}-A`}
            optKey={o.key}
            selected={partA === o.key}
            onSelect={() => pick("A", o.key)}
            mode={mode}
            correct={o.correct}
            analysis={ax[`A:${o.key}`]}
          >
            {o.text}
          </OptionRow>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <StemLine>Part B. {item.stem.partB}</StemLine>
        {item.partB.options.map((o: any) => (
          <OptionRow
            key={o.key}
            name={`${item.id}-B`}
            optKey={o.key}
            selected={partB === o.key}
            onSelect={() => pick("B", o.key)}
            mode={mode}
            correct={o.correct}
            analysis={ax[`B:${o.key}`]}
          >
            <span className="italic">“{o.text}”</span>
          </OptionRow>
        ))}
      </div>
    </div>
  );
}
