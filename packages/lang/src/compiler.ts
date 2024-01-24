import { Atom, AtomKind, Identifier, Tuple, Variable } from "./parser";
import { Program, Clause } from "./program";
import { Result, failure, isResultError, success } from "./result";

export enum Tag {
  Declare = 0,
  Use,
  Reference,
  Symbol,
  Integer,
  Arity
}

export function mask(tag: Tag, word: number): number {
  return word << 3 | tag;
}

export function unmask(word: number): number {
  return word >> 3
}

export function tagOf(word: number): Tag {
  return (word & 0b111)
}

export enum CompilerErrorCode {
  Unknown = 0,
  IdentifierAsClause,
  VariableAsClause,
  WrongFormat,
  EmptyTerm,
  TupleAsFunctor,
  VariableAsFunctor
}

export class CompilerError extends Error {
  constructor(public code: CompilerErrorCode, public atom: Atom) {
    super("CompilerError");
  }
}

export type CompilerResult<V> = Result<CompilerError, V>;

export class Compiler {
  parseFunctorName(atom: Atom): CompilerResult<string> {
    switch (atom.kind) {
      case AtomKind.Identifier:
        return success(atom.token.value);
      case AtomKind.Variable:
        return failure(new CompilerError(CompilerErrorCode.VariableAsFunctor, atom));
      case AtomKind.Tuple:
        return failure(new CompilerError(CompilerErrorCode.TupleAsFunctor, atom));
    }
  }

  composeClauseKey(functorName: string, arity: number) {
    return `${functorName}/${arity}`;
  }

  compileIdentifierClause(program: Program, atom: Identifier): CompilerResult<Program> {
    const error = new CompilerError(CompilerErrorCode.IdentifierAsClause, atom)
    return failure(error);
  }

  compileVariableClause(program: Program, atom: Variable): CompilerResult<Program> {
    const error = new CompilerError(CompilerErrorCode.VariableAsClause, atom)
    return failure(error);
  }

  compileEmptyTuple(program: Program, atom: Atom): CompilerResult<Program> {
    return success(Program.empty());
  }

  compileMonadTuple(program: Program, tuple: Tuple): CompilerResult<Program> {
    const functor = tuple.atoms[0];
    switch (functor.kind) {
      case AtomKind.Identifier: {
        const addr = program.cells.length;
        const arity = 0;
        const len = 2;
        const neck = 2;
        const functorName = functor.token.value;

        const clauseKey = this.composeClauseKey(functorName, arity);
        const clause = new Clause(addr, len, neck, [addr], []);
        program.addClause(clauseKey, clause);

        program.addSymbol(functorName);

        const arityCell = mask(Tag.Arity, arity);
        const symbolIndex = program.findSymbol(functorName);
        const functorCell = mask(Tag.Symbol, symbolIndex);
        program.addCells([arityCell, functorCell]);

        return success(program);
      }
      case AtomKind.Variable: {
        const error = new CompilerError(CompilerErrorCode.VariableAsFunctor, functor)
        return failure(error);
      }
      case AtomKind.Tuple: {
        const error = new CompilerError(CompilerErrorCode.TupleAsFunctor, functor)
        return failure(error);
      }
    }
  }

  compileTupleClause(program: Program, atom: Tuple): CompilerResult<Program> {
    const len = atom.atoms.length;
    if (len === 0) {
      return this.compileEmptyTuple(program, atom);
    } else if (len === 1) {
      return this.compileMonadTuple(program, atom);
    } else {
      const error = new CompilerError(CompilerErrorCode.Unknown, atom)
      return failure(error);
    }
  }

  compileClause(program: Program, atom: Atom): CompilerResult<Program> {
    switch (atom.kind) {
      case AtomKind.Identifier:
        return this.compileIdentifierClause(program, atom);
      case AtomKind.Variable:
        return this.compileVariableClause(program, atom);
      case AtomKind.Tuple:
        return this.compileTupleClause(program, atom);
    }
  }

  compile(atoms: Atom[]): CompilerResult<Program> {
    const initial: CompilerResult<Program> = success(Program.empty());
    return atoms.reduce((lastResult: CompilerResult<Program>, atom: Atom) => {
      if (isResultError(lastResult)) {
        return lastResult;
      }
      const program = lastResult.value;

      const result = this.compileClause(program, atom);
      if (isResultError(result)) {
        return result;
      }

      program.append(result.value)

      return success<CompilerError, Program>(program)
    }, initial);
  }
}
