import React, { useState } from 'react';
import { parseTempoDaImmagine, RisultatoParsing } from '../domain/ocr';

interface ImageOcrUploadProps {
  onResult: (result: RisultatoParsing) => void;
  disabled?: boolean;
}

export function ImageOcrUpload({ onResult, disabled = false }: ImageOcrUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await parseTempoDaImmagine(file);
      onResult(result);
      if (!result.successo) {
        setError(result.messaggio);
      }
    } catch (err) {
      setError('Errore durante l\'elaborazione dell\'immagine');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="sr-only">Carica immagine</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || loading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </label>
      
      {loading && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Analisi immagine in corso...</span>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
