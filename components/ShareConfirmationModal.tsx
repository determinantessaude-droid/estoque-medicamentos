import React from 'react';
import { ShareIcon, WarningIcon } from './Icons';

type ShareConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const ShareConfirmationModal: React.FC<ShareConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl animate-scale-in">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-teal-100 sm:mx-0 sm:h-10 sm:w-10">
            <ShareIcon className="h-6 w-6 text-teal-600" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 id="modal-title" className="text-lg leading-6 font-medium text-gray-900">
              Importar Lista de Medicamentos
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Você abriu um link com uma lista de medicamentos compartilhada. Deseja substituir seu inventário atual por esta nova lista?
              </p>
               <p className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md flex items-start">
                 <WarningIcon className="flex-shrink-0 h-5 w-5 mr-2 text-yellow-500"/>
                 <span><strong>Atenção:</strong> Esta ação não pode ser desfeita e substituirá todos os seus dados locais.</span>
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Importar e Substituir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
