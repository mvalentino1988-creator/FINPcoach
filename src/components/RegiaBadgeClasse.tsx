import React from 'react';

export const BadgeClasse: React.FC<{ tipo: 'S' | 'SB' | 'SM'; n: number | null | undefined }> = ({ tipo, n }) => {
  if (n == null) return null;
  const cls =
    tipo === 'S' ? 'bg-primary-fixed text-on-primary-fixed-variant'
    : tipo === 'SB' ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
    : 'bg-tertiary-fixed text-on-tertiary-fixed-variant';
  return (
    <span className={`px-1 rounded font-label-caps text-[12px] font-bold leading-[14px] ${cls}`}>
      {tipo}
      {n}
    </span>
  );
};
