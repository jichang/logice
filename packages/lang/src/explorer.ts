import { QueryContext } from "./query";
import { Program, Tag, extractTagName, extractTag, detachTag } from "./program";

export function printCell(cell: number) {
  const tagName = extractTagName(cell);
  const tagValue = detachTag(cell);
  return `[${tagName}:${tagValue}]`;
}

export interface IExplorer {
  trackStep(step: string, ...args: any): void;
  printQueryContext(queryContext: QueryContext): void;
  printProgram(program: Program): void;
}

export class EmptyExplorer {
  trackStep(step: string, ...args: any) { }
  printQueryContext(queryContext: QueryContext) { }
  printProgram(program: Program) { }
}

export class ConsoleExplorer implements IExplorer {
  trackStep(step: string, ...args: any) {
    console.log(`Step ${step}: ${args}`)
  }

  printQueryContext(queryContext: QueryContext) {
    const { program: program } = queryContext;
    const cells =
      queryContext.heap.map((cell, index) => {
        const tag = extractTag(cell);
        const tagName = extractTagName(cell);
        const tagValue = tag === Tag.Symbol ? program.symbols[detachTag(cell)] : detachTag(cell);
        return `[${index}]:${cell} = ${tagName} ${tagValue}`;
      }).join('\n');

    const frames = queryContext.frames.map((frame) => {
      return `SourceAddr: ${frame.sourceAddr}\nTargetAddr: ${frame.targetAddr}\nTrails: ${[...frame.trails.entries()]}`;
    }).join('\n');

    console.log([`QueryContext\nHeap:\n${cells}`, `Frames:\n${frames}`].join('\n\n'));
  }

  printProgram(program: Program) {
    const cells =
      program.cells.map((cell, index) => {
        const tag = extractTag(cell);
        const tagName = extractTagName(cell);
        const tagValue = tag === Tag.Symbol ? program.symbols[detachTag(cell)] : detachTag(cell);
        return `[${index}]:${cell} = ${tagName} ${tagValue}`;
      }).join('\n');

    const symbols =
      program.symbols.map((symbol, index) => {
        return `[${index}]: ${symbol}`;
      }).join('\n')

    const clauses = Array.from(program.clauses.entries()).map(entry => {
      const clauseKey = entry[0];
      const clauses = entry[1].map(clause => {
        return JSON.stringify(clause, null, 2)
      }).join('\n');
      return `${clauseKey}\n${clauses}`
    }).join('\n')

    console.log([`Program\nCells:\n${cells}`, `Symbols:\n${symbols}`, `Clauses:\n${clauses}`].join('\n\n'));
  }
}

