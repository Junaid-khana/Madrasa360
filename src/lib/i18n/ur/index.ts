import { admin } from "./admin";
import { attendance } from "./attendance";
import { common, dashboardExtra } from "./common";
import { fees } from "./fees";
import { hifz } from "./hifz";
import { students } from "./students";

/** English text -> Urdu. Add feature strings in the matching file. */
export const ur: Record<string, string> = { ...common, ...dashboardExtra, ...students, ...attendance, ...fees, ...hifz, ...admin };
