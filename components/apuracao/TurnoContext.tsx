"use client";

import { createContext, useContext } from "react";

/** Qual rodada a página está mostrando (1 = 1º turno salvo, 2 = apuração do dia 25). */
export const TurnoContext = createContext<1 | 2>(2);
export const useTurno = () => useContext(TurnoContext);
/** Sufixo de query para as APIs: "t=1" ou "t=2". */
export const qt = (t: 1 | 2) => `t=${t}`;
