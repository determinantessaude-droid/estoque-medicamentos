import React, { useState, useEffect } from 'react';
import { CloseIcon, ShareIcon } from './Icons';

type ShareLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
};

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, shareUrl }) => {
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
      // Fallback for older browsers or if permission is denied
      // The input is already selected, so user can manually copy.
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
            Compartilhar Lista de Medicamentos
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <CloseIcon />
          </button>
        </div>
        <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
                Copie e envie o link abaixo para compartilhar seu inventário atual. Qualquer pessoa com o link poderá visualizar e importar sua lista.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onClick={handleInputClick}
                    className="flex-grow bg-gray-100 border border-gray-300 rounded-md shadow-sm p-2 text-sm text-gray-700 focus:ring-teal-500 focus:border-teal-500"
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
                    {isCopied ? 'Copiado!' : 'Copiar Link'}
                </button>
            </div>
        </div>
        <div className="p-4 border-t flex justify-end">
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
