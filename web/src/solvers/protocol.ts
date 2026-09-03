import type { SolverEvent } from "@/model/events";

export interface RunCommand {
    solverId: string;
    /** The user's flags, wrapped into argv by the solver's `argv`. */
    flags: string[];
    cnfName: string;
    cnfBytes: Uint8Array;
}

/** worker (solver command run) to main thread message */
export type WorkerMessage =
    | { type: "events"; events: SolverEvent[]; bytes: number }
    | {
          type: "done";
          exitCode: number;
          output: string;
          bytes: number;
          protocolVersion: string | null;
          log: Blob;
      }
    | {
          type: "error";
          message: string;
          line?: { number: number; text: string };
      };
