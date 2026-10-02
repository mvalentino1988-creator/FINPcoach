export class ClassiSportive {
  /**
   * Da verificare sul regolamento WPS in vigore.
   * Nota: la classe SB10 non esiste.
   */
  static valida(s?: number | null, sb?: number | null, sm?: number | null): string[] {
    const errori: string[] = [];
    if (s != null && (s < 1 || s > 14)) {
      errori.push(`Classe S${s} non valida (S1–S14)`);
    }
    if (sb != null && (sb < 1 || sb > 14 || sb === 10)) {
      errori.push(`Classe SB${sb} non valida (SB1–SB9, SB11–SB14)`);
    }
    if (sm != null && (sm < 1 || sm > 14)) {
      errori.push(`Classe SM${sm} non valida (SM1–SM14)`);
    }
    return errori;
  }
}
