
import React, { useState, useEffect } from 'react';
import { CloseIcon, ShareIcon, DownloadIcon } from './Icons';

type ShareLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  onDownload: () => void;
};

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, shareUrl, onDownload }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-scale-in">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 id="modal-title" className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShareIcon className="w-6 h-6 text-teal-600"/>
            Compartilhar Lista
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <CloseIcon />
          </button>
        </div>
        <div className="p-6 space-y-6">
            {shareUrl ? (
                <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Link Direto</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Copie o link abaixo. Quem receber poderá importar sua lista automaticamente.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            onClick={handleInputClick}
                            className="flex-grow bg-gray-50 border border-gray-300 rounded-md shadow-sm p-2 text-sm text-gray-700 focus:ring-teal-500 focus:border-teal-500"
                            aria-label="Link de compartilhamento"
                        />
                        <button
                            onClick={handleCopy}
                            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-colors duration-200 ${
                                isCopied
                                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                                    : 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500'
                            }`}
                        >
                            {isCopied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>
            ) : (
                 <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                O compartilhamento por link não está disponível neste ambiente (preview/blob). Por favor, use o backup abaixo.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Arquivo de Backup</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Baixe o arquivo <strong>.json</strong>. Para importar, use a opção "Importar Arquivo" ao adicionar um medicamento.
                </p>
                <button
                    onClick={onDownload}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    <DownloadIcon className="w-5 h-5 text-gray-500"/>
                    Baixar Backup (.json)
                </button>
            </div>
        </div>
        <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-xl">
            <button
                type="button"
                onClick={onClose}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};
