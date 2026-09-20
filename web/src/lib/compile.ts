/**
 * Compiles limboole syntax to DIMACS.
 *
 *   expr    ::= implies { '<->' implies }
 *   implies ::= or [ ('->' | '<-') implies ]
 *   or      ::= and { '|' and }
 *   and     ::= not { '&' not }
 *   not     ::= '!' not | var | '(' expr ')'
 *
 * Small formulas are turned into CNF directly. If that would need more
 * than 2048 clauses, we fall back to Tseitin encoding with aux variables.
 */

/** dimacs integer to variable name mapping. index 0 unused! */
export type VarNames = (string | undefined)[];

export interface CompileError {
    message: string;
    line: number;
    column: number;
    lineText: string;
}

export type CompileResult =
    | {
          ok: true;
          dimacs: string;
          names: VarNames;
          variables: number;
          clauses: number;
      }
    | { ok: false; error: CompileError };

const BUDGET = 2048;

type Ast =
    | { k: "var"; id: number }
    | { k: "not"; a: Ast }
    | { k: "and" | "or" | "iff"; l: Ast; r: Ast };

type Clause = number[];

interface Token {
    text: string; // "" marks the end of input
    at: number;
}

class Fail {
    constructor(
        readonly message: string,
        readonly at: number,
    ) {}
}

class TooBig {}

function lex(src: string): Token[] {
    // whitespace | comment | operators | variable
    const token = /\s+|%.*|<->|<-|->|[()!&|]|[\w.$@[\]]+/y;
    const toks: Token[] = [];

    while (token.lastIndex < src.length) {
        const at = token.lastIndex;
        const match = token.exec(src);

        if (!match) {
            throw new Fail(`unexpected "${src[at]}"`, at);
        }

        const text = match[0];
        const skip = /^\s/.test(text) || text.startsWith("%");

        if (!skip) {
            toks.push({ text, at });
        }
    }

    toks.push({ text: "", at: src.length });
    return toks;
}

const isVar = (text: string) => /^[\w.$@[\]]/.test(text);

function parse(tokens: Token[]) {
    const ids = new Map<string, number>();
    const names: VarNames = [undefined];
    let p = 0;

    const eat = (text: string): boolean => {
        if (tokens[p].text !== text) {
            return false;
        }
        p++;
        return true;
    };

    const expr = (): Ast => {
        let node = implies();
        while (eat("<->")) {
            node = { k: "iff", l: node, r: implies() };
        }
        return node;
    };

    const implies = (): Ast => {
        const l = or();
        if (eat("->")) {
            return { k: "or", l: { k: "not", a: l }, r: implies() };
        }
        if (eat("<-")) {
            return { k: "or", l, r: { k: "not", a: implies() } };
        }
        return l;
    };

    const or = (): Ast => {
        let node = and();
        while (eat("|")) {
            node = { k: "or", l: node, r: and() };
        }
        return node;
    };

    const and = (): Ast => {
        let node = not();
        while (eat("&")) {
            node = { k: "and", l: node, r: not() };
        }
        return node;
    };

    const not = (): Ast => {
        if (eat("!")) {
            return { k: "not", a: not() };
        }

        if (eat("(")) {
            const inner = expr();
            if (!eat(")")) {
                throw new Fail("expected )", tokens[p].at);
            }
            return inner;
        }

        const t = tokens[p];
        if (!isVar(t.text)) {
            const found = t.text ? `"${t.text}"` : "end of input";
            throw new Fail(`expected a variable or (, found ${found}`, t.at);
        }
        p++;

        if (!ids.has(t.text)) {
            ids.set(t.text, names.length);
            names.push(t.text);
        }
        return { k: "var", id: ids.get(t.text)! };
    };

    const ast = expr();

    if (tokens[p].text !== "") {
        throw new Fail(`unexpected "${tokens[p].text}"`, tokens[p].at);
    }

    return { ast, names };
}

function conj(a: Clause[], b: Clause[]): Clause[] {
    if (a.length + b.length > BUDGET) {
        throw new TooBig();
    }
    return [...a, ...b];
}

function disj(a: Clause[], b: Clause[]): Clause[] {
    if (a.length * b.length > BUDGET) {
        throw new TooBig();
    }
    return a.flatMap((x) => b.map((y) => [...x, ...y]));
}

function distribute(a: Ast, neg: boolean): Clause[] {
    switch (a.k) {
        case "var":
            return [[neg ? -a.id : a.id]];

        case "not":
            return distribute(a.a, !neg);

        case "and": {
            const l = distribute(a.l, neg);
            const r = distribute(a.r, neg);
            return neg ? disj(l, r) : conj(l, r);
        }

        case "or": {
            const l = distribute(a.l, neg);
            const r = distribute(a.r, neg);
            return neg ? conj(l, r) : disj(l, r);
        }

        case "iff":
            //  l <-> r   is  (!l | r) & (l | !r)
            // !(l <-> r) is  ( l | r) & (!l | !r)
            return conj(
                disj(distribute(a.l, !neg), distribute(a.r, false)),
                disj(distribute(a.l, neg), distribute(a.r, true)),
            );
    }
}

/** Direct CNF, or null if it would exceed the clause budget. */
function directCnf(ast: Ast): Clause[] | null {
    try {
        return distribute(ast, false);
    } catch (e) {
        if (e instanceof TooBig) {
            return null;
        }
        throw e;
    }
}

/** One fresh variable per and/or/iff node, defined as equivalent to it. */
function tseitin(root: Ast, varCount: number) {
    const clauses: Clause[] = [];

    const lit = (a: Ast): number => {
        if (a.k === "var") {
            return a.id;
        }
        if (a.k === "not") {
            return -lit(a.a);
        }

        const l = lit(a.l);
        const r = lit(a.r);
        const v = ++varCount;

        if (a.k === "and") {
            clauses.push([-v, l], [-v, r], [v, -l, -r]);
        } else if (a.k === "or") {
            clauses.push([-v, l, r], [v, -l], [v, -r]);
        } else {
            clauses.push([-v, -l, r], [-v, l, -r], [v, l, r], [v, -l, -r]);
        }

        return v;
    };

    clauses.push([lit(root)]);
    return { clauses, varCount };
}

function locate(src: string, at: number) {
    const before = src.slice(0, at).split("\n");
    const line = before.length;

    return {
        line,
        column: before[line - 1].length + 1,
        lineText: src.split("\n")[line - 1],
    };
}

export function compileFormula(source: string): CompileResult {
    try {
        const toks = lex(source);

        if (toks.length === 1) {
            throw new Fail("formula is empty", 0);
        }

        const { ast, names } = parse(toks);
        const sourceCount = names.length - 1;

        const direct = directCnf(ast);
        const { clauses, varCount } = direct
            ? { clauses: direct, varCount: sourceCount }
            : tseitin(ast, sourceCount);

        const kept = clauses.filter((c): c is Clause => c !== null);

        const lines = [
            ...names.slice(1).map((name, i) => `c ${i + 1} ${name}`),
            `p cnf ${varCount} ${kept.length}`,
            ...kept.map((c) => `${c.join(" ")} 0`),
        ];

        return {
            ok: true,
            dimacs: `${lines.join("\n")}\n`,
            names,
            variables: varCount,
            clauses: kept.length,
        };
    } catch (e) {
        if (e instanceof Fail) {
            return {
                ok: false,
                error: { message: e.message, ...locate(source, e.at) },
            };
        }
        throw e;
    }
}
