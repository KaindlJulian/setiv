export interface Sample {
    file: string;
    label: string;
    note: string;
}

export const samples: Sample[] = [
    {
        file: "chain_20.cnf",
        label: "Equivalence chain",
        note: "x1 <-> x2 <-> ... <-> x20. One decision propagates the whole chain.",
    },
    {
        file: "php_5_4.cnf",
        label: "Pigeonhole 5 to 4",
        note: "Five pigeons into four holes. Every branch ends in a conflict.",
    },
    {
        file: "kcolor_2_3.cnf",
        label: "Graph 2-coloring",
        note: "Two coloring problem for a 3-vertex complete graph.",
    },
    {
        file: "ramsey_3_3_5.cnf",
        label: "Ramsey R(3,3), 5 vertices",
        note: "Describes a 5-vertex graph with no triangle and no independent set of size 3.",
    },
    {
        file: "ramsey_3_3_6.cnf",
        label: "Ramsey R(3,3), 6 vertices",
        note: "Describes a 6-vertex graph with no triangle and no independent set of size 3.",
    },
    {
        file: "peb_pyr3_xor2.cnf",
        label: "Pebbling for pyramid of height 3",
        note: "XOR-substituted pebbling contradiction.",
    },
    {
        file: "tseitin_4reg_16.cnf",
        label: "Tseitin, 4-regular, 16 vertices",
        note: "Odd total charge on a random 4-regular graph.",
    },
    {
        file: "op_8.cnf",
        label: "Ordering principle, 8 elements",
        note: "Encodes an 8 element partial order in which no element is minimal.",
    },
    {
        file: "adder_miter_4bit.cnf",
        label: "4-bit adder miter",
        note: "Equivalence check of two 4-bit adders.",
    },
    {
        file: "sudoku.cnf",
        label: "Sudoku 9x9",
        note: "Encodes a 9x9 sudoku puzzle. Expect a large log.",
    },
];
