import React, { useState, useCallback, ChangeEvent, FormEvent, useEffect } from 'react';
import { Medication } from '../types';
import { extractMedicationInfoFromFile, extractMedicationInfoFromText, suggestPmc, suggestMedicationDetails, generateMechanismOfAction, suggestMedicationClass } from '../services/geminiService';
import { PlusIcon, CameraIcon, FileUploadIcon, CloseIcon, SpinnerIcon, SparkIcon } from './Icons';

type AddMedicationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medicationData: Omit<Medication, 'id'>, id?: string) => void;
  medicationToEdit?: Medication | null;
};

type InputMode = 'manual' | 'file' | 'camera';

const initialFormState = {
  name: '',
  activeIngredient: '',
  manufacturer: '',
  presentation: '',
  class: '',
  quantity: 1,
  expirationDate: '',
  mechanismOfAction: '',
  barcode: '',
  pmc: 0,
  officeNumber: '',
};

export const AddMedicationModal: React.FC<AddMedicationModalProps> = ({ isOpen, onClose, onSave, medicationToEdit }) => {
  const isEditMode = !!medicationToEdit;
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [formData, setFormData] = useState(initialFormState);
  const [displayExpirationDate, setDisplayExpirationDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuggestingPmc, setIsSuggestingPmc] = useState(false);
  const [isSuggestingDetails, setIsSuggestingDetails] = useState(false);
  const [isGeneratingMoA, setIsGeneratingMoA] = useState(false);
  const [isSuggestingClass, setIsSuggestingClass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraPermissionModalOpen, setIsCameraPermissionModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && medicationToEdit) {
        setFormData({
            name: medicationToEdit.name,
            activeIngredient: medicationToEdit.activeIngredient,
            manufacturer: medicationToEdit.manufacturer,
            presentation: medicationToEdit.presentation,
            class: medicationToEdit.class,
            quantity: medicationToEdit.quantity,
            expirationDate: medicationToEdit.expirationDate,
            mechanismOfAction: medicationToEdit.mechanismOfAction,
            barcode: medicationToEdit.barcode,
            pmc: medicationToEdit.pmc,
            officeNumber: medicationToEdit.officeNumber || '',
        });

        if (medicationToEdit.expirationDate) {
            const dateParts = medicationToEdit.expirationDate.split('-');
            if (dateParts.length === 3) {
                const [year, month, day] = dateParts;
                setDisplayExpirationDate(`${day}/${month}/${year}`);
            } else {
                setDisplayExpirationDate('');
            }
        } else {
            setDisplayExpirationDate('');
        }
        setInputMode('manual');
      } else {
        setFormData(initialFormState);
        setDisplayExpirationDate('');
        setInputMode('manual');
      }
      setError(null);
      setImagePreview(null);
      setIsSuggestingPmc(false);
      setIsSuggestingDetails(false);
      setIsGeneratingMoA(false);
      setIsSuggestingClass(false);
      setIsCameraPermissionModalOpen(false);
    }
  }, [isOpen, isEditMode, medicationToEdit]);

  useEffect(() => {
    if (isEditMode || !formData.name || formData.name.length < 3) {
      setIsSuggestingDetails(false);
      return;
    }

    const fetchDetails = async () => {
      setIsSuggestingDetails(true);
      const details = await suggestMedicationDetails(formData.name);
      
      setFormData(prev => ({
        ...prev,
        activeIngredient: prev.activeIngredient || details.activeIngredient || '',
        manufacturer: prev.manufacturer || details.manufacturer || '',
        presentation: prev.presentation || details.presentation || '',
        class: prev.class || details.class || '',
      }));
      setIsSuggestingDetails(false);
    };

    const debounceTimer = setTimeout(() => {
      fetchDetails();
    }, 500);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [formData.name, isEditMode]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === 'quantity') {
      processedValue = Math.max(0, parseInt(value, 10) || 0);
    } else if (name === 'pmc') {
      processedValue = Math.max(0, parseFloat(value) || 0);
    }
    setFormData(prev => ({ ...prev, [name]: processedValue as any }));
  };

  const handleExpirationDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDisplayExpirationDate(e.target.value);
  };
  
  const handleExpirationDateBlur = () => {
      const value = displayExpirationDate.trim();
  
      if (!value) {
          setFormData(prev => ({ ...prev, expirationDate: '' }));
          return;
      }
      
      const mmYYYYMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
      if (mmYYYYMatch) {
          const month = parseInt(mmYYYYMatch[1], 10);
          const year = parseInt(mmYYYYMatch[2], 10);
          if (month >= 1 && month <= 12 && year > 1900) {
              const lastDayOfMonth = new Date(year, month, 0).getDate();
              const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
              setFormData(prev => ({ ...prev, expirationDate: isoDate }));
              setDisplayExpirationDate(`${String(lastDayOfMonth).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`);
              return;
          }
      }
  
      const ddMmYyyyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddMmYyyyMatch) {
          const day = parseInt(ddMmYyyyMatch[1], 10);
          const month = parseInt(ddMmYyyyMatch[2], 10);
          const year = parseInt(ddMmYyyyMatch[3], 10);
          const date = new Date(year, month - 1, day);
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
              const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              setFormData(prev => ({ ...prev, expirationDate: isoDate }));
              setDisplayExpirationDate(`${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`);
              return;
          }
      }
  
      // If parsing fails, clear the internal date to prevent saving invalid data
      setFormData(prev => ({ ...prev, expirationDate: '' }));
  };
  
  const handleTabClick = (mode: InputMode) => {
    if (mode === 'camera') {
      setIsCameraPermissionModalOpen(true);
    } else {
      setError(null);
      setInputMode(mode);
    }
  };

  const handleCameraPermissionRequest = async () => {
    try {
      // @ts-ignore - aistudio is a global provided by the platform
      await window.aistudio.requestFramePermissions(['camera']);
      setError(null);
      setInputMode('camera');
    } catch (err) {
      setError('A permissão da câmera foi negada. Você pode precisar habilitá-la nas configurações do seu navegador.');
      console.error('Camera permission denied:', err);
    } finally {
      setIsCameraPermissionModalOpen(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setImagePreview(null);

    try {
        let extractedData: Partial<Medication>[];
        const fileType = file.type;

        if (fileType.startsWith('image/')) {
            setImagePreview(URL.createObjectURL(file));
        }

        const isImage = fileType.startsWith('image/');
        const isPdf = fileType === 'application/pdf';
        const isTxt = fileType === 'text/plain' || file.name.endsWith('.txt');

        if (isImage || isPdf) {
            const base64String = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
            });
            extractedData = await extractMedicationInfoFromFile(base64String, file.type);
        } else if (isTxt) {
            const textContent = await file.text();
            extractedData = await extractMedicationInfoFromText(textContent);
        } else {
            throw new Error('Tipo de arquivo não suportado. Por favor, use um arquivo de imagem, PDF ou .txt.');
        }
        
        if (extractedData && extractedData.length > 0) {
            extractedData.forEach(med => {
                const medicationWithDefaults = {
                    ...initialFormState,
                    ...med,
                    quantity: med.quantity || 1,
                    pmc: med.pmc || 0,
                };
                onSave(medicationWithDefaults);
            });
            onClose();
        } else {
             setError("Nenhum medicamento foi encontrado no arquivo. Tente a entrada manual.");
             setInputMode('manual');
        }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestPmc = async () => {
    if (!formData.name) {
      setError("Por favor, insira o nome do medicamento para sugerir o PMC.");
      return;
    }
    setIsSuggestingPmc(true);
    setError(null);
    try {
      const suggestedPrice = await suggestPmc(formData.name, formData.presentation);
      if (suggestedPrice !== null) {
        setFormData(prev => ({ ...prev, pmc: suggestedPrice }));
      } else {
        setError("PMC não encontrado para este medicamento/apresentação. Verifique o nome e a apresentação ou insira manualmente.");
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao buscar a sugestão de PMC.');
    } finally {
      setIsSuggestingPmc(false);
    }
  };

  const handleSuggestClass = async () => {
    if (!formData.name) {
        setError("Por favor, insira o nome do medicamento para sugerir a classe.");
        return;
    }
    setIsSuggestingClass(true);
    setError(null);
    try {
        const suggestion = await suggestMedicationClass(formData.name, formData.activeIngredient);
        if (suggestion) {
            setFormData(prev => ({ ...prev, class: suggestion }));
        } else {
            setError("Não foi possível encontrar uma sugestão de classe.");
        }
    } catch (err: any) {
        setError(err.message || 'Ocorreu um erro ao sugerir a classe.');
    } finally {
        setIsSuggestingClass(false);
    }
  };

  const handleGenerateMoA = async () => {
    if (!formData.activeIngredient) {
        setError("Forneça o princípio ativo para gerar o mecanismo de ação.");
        return;
    }
    setIsGeneratingMoA(true);
    setError(null);
    try {
        const explanation = await generateMechanismOfAction(formData.activeIngredient);
        setFormData(prev => ({ ...prev, mechanismOfAction: explanation }));
    } catch (err: any) {
        setError(err.message || 'Ocorreu um erro ao gerar a explicação.');
    } finally {
        setIsGeneratingMoA(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
        setError("O nome do medicamento é obrigatório.");
        return;
    }
    onSave(formData, medicationToEdit?.id);
    onClose();
  };

  if (!isOpen) return null;

  const TabButton:React.FC<{mode: InputMode, label: string, icon: React.ReactNode}> = ({mode, label, icon}) => (
    <button
        type="button"
        onClick={() => handleTabClick(mode)}
        className={`flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 rounded-t-lg transition-colors ${
        inputMode === mode
            ? 'bg-white text-teal-600 border-b-2 border-teal-600'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
    >
        {icon}
        {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Editar Medicamento' : 'Adicionar Medicamento'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <CloseIcon />
            </button>
          </div>
          {!isEditMode && (
              <div className="flex bg-gray-50">
                 <TabButton mode="manual" label="Entrada Manual" icon={<PlusIcon className="w-5 h-5" />} />
                 <TabButton mode="file" label="Importar Arquivo" icon={<FileUploadIcon className="w-5 h-5" />} />
                 <TabButton mode="camera" label="Escanear Foto" icon={<CameraIcon className="w-5 h-5" />} />
              </div>
          )}
          
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
              {inputMode === 'file' && !isEditMode && (
                  <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <FileUploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                          {isProcessing ? 'Processando Arquivo...' : 'Carregar Imagem, PDF ou Texto'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Use uma receita em PDF, uma imagem ou um arquivo de texto (.txt).
                      </p>
                      <div className="mt-4">
                          <input
                              type="file"
                              accept="image/*,application/pdf,.txt"
                              onChange={handleFileChange}
                              className="sr-only"
                              id="doc-upload"
                              disabled={isProcessing}
                          />
                          <label
                              htmlFor="doc-upload"
                              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 cursor-pointer ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                              {isProcessing ? <SpinnerIcon /> : <FileUploadIcon className="-ml-1 mr-2 h-5 w-5" />}
                              <span>{isProcessing ? 'Analisando...' : 'Selecionar Arquivo'}</span>
                          </label>
                      </div>
                  </div>
              )}
              
              {inputMode === 'camera' && !isEditMode && (
                   <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                          {isProcessing ? 'Processando Imagem...' : 'Escanear Embalagem'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Use a câmera para tirar uma foto da embalagem do medicamento.
                      </p>
                      <div className="mt-4">
                          <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleFileChange}
                              className="sr-only"
                              id="camera-upload"
                              disabled={isProcessing}
                          />
                          <label
                              htmlFor="camera-upload"
                              className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 cursor-pointer ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                              {isProcessing ? <SpinnerIcon /> : <CameraIcon className="-ml-1 mr-2 h-5 w-5" />}
                              <span>{isProcessing ? 'Analisando...' : 'Tirar Foto'}</span>
                          </label>
                      </div>
                      {imagePreview && !isProcessing && <img src={imagePreview} alt="Preview" className="mt-4 max-h-40 mx-auto rounded-md" />}
                  </div>
              )}

              {(inputMode === 'manual' || isEditMode) && (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome do Medicamento*</label>
                          <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                      </div>
                      <div>
                          <label htmlFor="activeIngredient" className="block text-sm font-medium text-gray-700">Princípio Ativo</label>
                           <div className="relative">
                              <input
                                  type="text"
                                  name="activeIngredient"
                                  id="activeIngredient"
                                  value={formData.activeIngredient}
                                  onChange={handleInputChange}
                                  placeholder="Ex: Dipirona"
                                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                              />
                              {isSuggestingDetails && (
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                      <SpinnerIcon className="h-4 w-4 text-teal-600" />
                                  </div>
                              )}
                          </div>
                      </div>
                       <div>
                          <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">Laboratório</label>
                           <div className="relative">
                              <input
                                  type="text"
                                  name="manufacturer"
                                  id="manufacturer"
                                  value={formData.manufacturer}
                                  onChange={handleInputChange}
                                  placeholder="Ex: Pfizer"
                                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                              />
                              {isSuggestingDetails && (
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                      <SpinnerIcon className="h-4 w-4 text-teal-600" />
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label htmlFor="presentation" className="block text-sm font-medium text-gray-700">Apresentação</label>
                          <div className="relative">
                              <input
                                  type="text"
                                  name="presentation"
                                  id="presentation"
                                  value={formData.presentation}
                                  onChange={handleInputChange}
                                  placeholder="Ex: 50mg, 30 caps"
                                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                              />
                              {isSuggestingDetails && (
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                      <SpinnerIcon className="h-4 w-4 text-teal-600" />
                                  </div>
                              )}
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between items-center">
                              <label htmlFor="class" className="block text-sm font-medium text-gray-700">Classe</label>
                              <button
                                  type="button"
                                  onClick={handleSuggestClass}
                                  disabled={!formData.name || isSuggestingClass || isSuggestingDetails}
                                  className="inline-flex items-center gap-1.5 rounded-md py-1 px-2 text-xs font-semibold text-teal-600 hover:bg-teal-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                                  title="Sugerir classe com IA"
                              >
                                  {isSuggestingClass ? (
                                      <SpinnerIcon className="h-4 w-4 text-teal-600" />
                                  ) : (
                                      <SparkIcon className="h-4 w-4" />
                                  )}
                                  <span>{isSuggestingClass ? 'Sugerindo...' : 'Sugerir com IA'}</span>
                              </button>
                          </div>
                          <div className="relative">
                              <input type="text" name="class" id="class" value={formData.class} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                              {isSuggestingDetails && !isSuggestingClass && (
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                      <SpinnerIcon className="h-4 w-4 text-teal-600" />
                                  </div>
                              )}
                          </div>
                      </div>
                      <div>
                          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantidade</label>
                          <input type="number" name="quantity" id="quantity" value={formData.quantity} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                      </div>
                      <div>
                          <label htmlFor="pmc" className="block text-sm font-medium text-gray-700">PMC (R$)</label>
                          <div className="mt-1 flex rounded-md shadow-sm">
                              <input type="number" step="0.01" name="pmc" id="pmc" value={formData.pmc > 0 ? formData.pmc : ''} onChange={handleInputChange} placeholder="0.00" className="flex-1 block w-full rounded-none rounded-l-md border-gray-300 focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                              <button
                                  type="button"
                                  onClick={handleSuggestPmc}
                                  disabled={!formData.name || isSuggestingPmc}
                                  className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  title="Sugerir PMC com base no nome do medicamento"
                              >
                                  {isSuggestingPmc ? <SpinnerIcon className="h-4 w-4 text-teal-600" /> : 'Sugerir'}
                              </button>
                          </div>
                      </div>
                      <div>
                          <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">Data de Validade</label>
                          <input 
                              type="text" 
                              name="expirationDate" 
                              id="expirationDate" 
                              value={displayExpirationDate} 
                              onChange={handleExpirationDateChange}
                              onBlur={handleExpirationDateBlur}
                              placeholder="MM/AAAA ou DD/MM/AAAA"
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                      </div>
                      <div className="md:col-span-2">
                          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">Código de Barras</label>
                          <input type="text" name="barcode" id="barcode" value={formData.barcode} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                      </div>
                      <div className="md:col-span-2">
                          <label htmlFor="officeNumber" className="block text-sm font-medium text-gray-700">Nº do Consultório</label>
                          <input type="text" name="officeNumber" id="officeNumber" value={formData.officeNumber || ''} onChange={handleInputChange} placeholder="Ex: 101" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                      </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                        <label htmlFor="mechanismOfAction" className="block text-sm font-medium text-gray-700">Mecanismo de Ação</label>
                        <button
                            type="button"
                            onClick={handleGenerateMoA}
                            disabled={!formData.activeIngredient || isGeneratingMoA}
                            className="inline-flex items-center gap-1.5 rounded-md py-1 px-2 text-xs font-semibold text-teal-600 hover:bg-teal-50 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                            title="Gerar explicação com IA"
                        >
                            {isGeneratingMoA ? (
                                <SpinnerIcon className="h-4 w-4 text-teal-600" />
                            ) : (
                                <SparkIcon className="h-4 w-4" />
                            )}
                            <span>{isGeneratingMoA ? 'Gerando...' : 'Gerar com IA'}</span>
                        </button>
                    </div>
                    <textarea name="mechanismOfAction" id="mechanismOfAction" value={formData.mechanismOfAction} onChange={handleInputChange} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                  </div>
                  </>
              )}
              
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                  Cancelar
                </button>
                <button type="submit" disabled={isProcessing || (inputMode !== 'manual' && !isEditMode)} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isEditMode ? 'Salvar Alterações' : 'Salvar Medicamento'}
                </button>
              </div>
          </form>
        </div>
      </div>
      {isCameraPermissionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl animate-scale-in">
              <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-teal-100 sm:mx-0 sm:h-10 sm:w-10">
                      <CameraIcon className="h-6 w-6 text-teal-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Permissão da Câmera
                      </h3>
                      <div className="mt-2">
                          <p className="text-sm text-gray-500">
                              Para escanear a embalagem do medicamento, precisamos de acesso à sua câmera. Sua imagem não será armazenada.
                          </p>
                      </div>
                  </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                      type="button"
                      onClick={handleCameraPermissionRequest}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                      Permitir
                  </button>
                  <button
                      type="button"
                      onClick={() => setIsCameraPermissionModalOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                      Cancelar
                  </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
};