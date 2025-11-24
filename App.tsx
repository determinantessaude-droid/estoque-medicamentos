
import React, { useState, useEffect, useMemo } from 'react';
import { Medication } from './types';
import { AddMedicationModal } from './components/AddMedicationModal';
import { ReportModal } from './components/ReportModal';
import { TrashIcon, PlusIcon, ReportIcon, EditIcon, WarningIcon } from './components/Icons';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { ShareConfirmationModal } from './components/ShareConfirmationModal';
import { getMedicationsFromDB, saveMedicationsToDB } from './services/db';

const users = {
    main: { id: 'user_main', name: 'Usuário Principal' },
    authorized: { id: 'user_authorized_1', name: 'Usuário Autorizado' },
    unauthorized: { id: 'user_unauthorized_1', name: 'Usuário Não Autorizado' },
};
const MAIN_USER_ID = users.main.id;
const AUTHORIZED_USER_IDS = [users.authorized.id];

const App: React.FC = () => {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null);
    const [currentUser, setCurrentUser] = useState(users.main);
    const [sharedData, setSharedData] = useState<Medication[] | null>(null);

    useEffect(() => {
        const loadMedications = async () => {
            try {
                const storedMedications = await getMedicationsFromDB();
                setMedications(storedMedications);
            } catch (error) {
                console.error("Failed to load medications from IndexedDB:", error);
                setMedications([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadMedications();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const data = params.get('data');
        const isCompressed = params.get('compressed') === 'true';

        if (data) {
            const processData = async () => {
                try {
                    let unsafeBase64 = data.replace(/-/g, '+').replace(/_/g, '/');
                    while (unsafeBase64.length % 4) {
                        unsafeBase64 += '=';
                    }

                    // Decode base64 using fetch API for robustness
                    const fetchResponse = await fetch(`data:application/octet-stream;base64,${unsafeBase64}`);
                    const dataBlob = await fetchResponse.blob();
                    
                    let streamToDecode = dataBlob.stream();
                    if (isCompressed) {
                        streamToDecode = dataBlob.stream().pipeThrough(new DecompressionStream('gzip'));
                    }
                    
                    const decodedData = await new Response(streamToDecode).text();

                    const parsedData = JSON.parse(decodedData);
                    if (Array.isArray(parsedData)) {
                        setSharedData(parsedData as Medication[]);
                    } else {
                        console.error("Shared data is not an array.");
                        alert("Os dados compartilhados são inválidos.");
                    }
                } catch (error) {
                    console.error("Failed to parse shared data:", error);
                    alert("Falha ao carregar os dados compartilhados. O link pode estar corrompido.");
                } finally {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            };
            processData();
        }
    }, []);


    useEffect(() => {
        if (isLoading) {
            return;
        }
        try {
            saveMedicationsToDB(medications);
        } catch (error) {
            console.error("Failed to save medications to IndexedDB:", error);
        }
    }, [medications, isLoading]);

    const canEditOrDelete = (medication: Medication): boolean => {
        if (medication.userId === currentUser.id) {
            return true;
        }
        if (AUTHORIZED_USER_IDS.includes(currentUser.id) && medication.userId === MAIN_USER_ID) {
            return true;
        }
        return false;
    };

    const saveMedication = (medicationData: Omit<Medication, 'id' | 'userId'>, id?: string) => {
        if (id) {
            setMedications(prev => prev.map(med => {
                if (med.id === id) {
                    return { ...med, ...medicationData };
                }
                return med;
            }));
        } else {
            const newMedication: Medication = {
                ...medicationData,
                id: new Date().toISOString() + Math.random(),
                userId: currentUser.id,
            };
            setMedications(prev => [...prev, newMedication]);
        }
    };

    const handleConfirmDelete = () => {
        if (!medicationToDelete || !canEditOrDelete(medicationToDelete)) return;
        setMedications(prev => prev.filter(med => med.id !== medicationToDelete.id));
        setMedicationToDelete(null);
    };
    
    const handleOpenAddModal = () => {
        setEditingMedication(null);
        setIsMedicationModalOpen(true);
    };

    const handleOpenEditModal = (medication: Medication) => {
        if (!canEditOrDelete(medication)) return;
        setEditingMedication(medication);
        setIsMedicationModalOpen(true);
    };

    const handleDeleteClick = (medication: Medication) => {
        if (!canEditOrDelete(medication)) return;
        setMedicationToDelete(medication);
    };

    const handleCloseModal = () => {
        setIsMedicationModalOpen(false);
        setEditingMedication(null);
    }

    const getStatus = (expDate: string): { text: string; color: string } => {
        if (!expDate) return { text: 'Sem data', color: 'bg-gray-100 text-gray-800' };
        
        // Use UTC dates to avoid timezone issues
        const today_local = new Date();
        const today = new Date(Date.UTC(today_local.getFullYear(), today_local.getMonth(), today_local.getDate()));

        const dateParts = expDate.split('-');
        if (dateParts.length !== 3) return { text: 'Data Inválida', color: 'bg-gray-100 text-gray-800' };
        
        const [year, month, day] = dateParts.map(Number);
        const expiration = new Date(Date.UTC(year, month - 1, day));

        const diffTime = expiration.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: 'Vencido', color: 'bg-red-100 text-red-800' };
        if (diffDays <= 30) return { text: 'Vence < 30d', color: 'bg-yellow-100 text-yellow-800' };
        if (diffDays <= 90) return { text: 'Vence < 90d', color: 'bg-orange-100 text-orange-800' };
        return { text: 'OK', color: 'bg-green-100 text-green-800' };
    };

    const summaryData = useMemo(() => {
        // Use UTC dates to avoid timezone issues
        const today_local = new Date();
        const today = new Date(Date.UTC(today_local.getFullYear(), today_local.getMonth(), today_local.getDate()));

        const expiringSoonCount = medications.filter(med => {
            if (!med.expirationDate) return false;
            
            const dateParts = med.expirationDate.split('-');
            if (dateParts.length !== 3) return false;

            const [year, month, day] = dateParts.map(Number);
            const expDate = new Date(Date.UTC(year, month - 1, day));
            
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 90;
        }).length;

        const expiredCount = medications.filter(med => {
            if (!med.expirationDate) return false;

            const dateParts = med.expirationDate.split('-');
            if (dateParts.length !== 3) return false;

            const [year, month, day] = dateParts.map(Number);
            const expDate = new Date(Date.UTC(year, month - 1, day));

            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays < 0;
        }).length;

        const lowStockCount = medications.filter(med => med.quantity <= 10).length;

        return {
            total: medications.length,
            expiringSoon: expiringSoonCount,
            lowStock: lowStockCount,
            expired: expiredCount,
        };
    }, [medications]);

    const filteredMedications = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        return medications.filter(med =>
            med.name.toLowerCase().includes(lowercasedFilter) ||
            (med.activeIngredient && med.activeIngredient.toLowerCase().includes(lowercasedFilter)) ||
            (med.manufacturer && med.manufacturer.toLowerCase().includes(lowercasedFilter)) ||
            (med.presentation && med.presentation.toLowerCase().includes(lowercasedFilter)) ||
            (med.class && med.class.toLowerCase().includes(lowercasedFilter)) ||
            (med.barcode && med.barcode.toLowerCase().includes(lowercasedFilter)) ||
            (med.officeNumber && med.officeNumber.toLowerCase().includes(lowercasedFilter))
        ).sort((a, b) => {
            const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : 0;
            const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });
    }, [medications, searchTerm]);

    const getUserName = (userId: string) => {
        const user = Object.values(users).find(u => u.id === userId);
        return user ? user.name : 'Desconhecido';
    };

    const handleConfirmImport = () => {
        if (sharedData) {
            setMedications(sharedData);
            setSharedData(null);
        }
    };

    const handleCancelImport = () => {
        setSharedData(null);
    };

    return (
        <div className="bg-gray-50 min-h-screen text-gray-800 font-sans">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
                    <h1 className="text-3xl font-bold text-teal-700">
                        Gestor de Estoque de Medicamentos
                    </h1>
                    <div className="mt-4 sm:mt-0 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Logado como:</span>
                        <select
                            value={currentUser.id}
                            onChange={(e) => setCurrentUser(Object.values(users).find(u => u.id === e.target.value) || users.main)}
                            className="text-sm font-semibold text-teal-700 border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        >
                            {Object.values(users).map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white p-5 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Total de Itens</h3>
                        <p className="mt-1 text-3xl font-semibold text-teal-600">{summaryData.total}</p>
                    </div>
                    <div className="bg-white p-5 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Vencidos</h3>
                        <p className="mt-1 text-3xl font-semibold text-red-600">{summaryData.expired}</p>
                    </div>
                    <div className="bg-white p-5 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Vencendo em 90 Dias</h3>
                        <p className="mt-1 text-3xl font-semibold text-yellow-600">{summaryData.expiringSoon}</p>
                    </div>
                    <div className="bg-white p-5 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Estoque Baixo (≤10)</h3>
                        <p className="mt-1 text-3xl font-semibold text-red-600">{summaryData.lowStock}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <div className="relative w-full md:w-1/3">
                            <input
                                type="text"
                                placeholder="Buscar por nome, princípio ativo, laboratório..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setIsReportModalOpen(true)}
                                className="flex-1 w-full md:w-auto md:flex-initial justify-center inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                            >
                                <ReportIcon className="w-5 h-5" />
                                <span>Gerar Relatório</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicamento</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Princípio Ativo</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd.</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validade</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredMedications.length > 0 ? filteredMedications.map(med => {
                                    const status = getStatus(med.expirationDate);
                                    const userCanEdit = canEditOrDelete(med);
                                    return (
                                        <tr key={med.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{med.name}</div>
                                                <div className="text-sm text-gray-500">{med.presentation || '-'}</div>
                                                <div className="text-xs text-gray-400 italic mt-1">Adicionado por: {getUserName(med.userId)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.activeIngredient || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {med.expirationDate ? new Date(med.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-x-4">
                                                    <button
                                                        onClick={() => handleOpenEditModal(med)}
                                                        className={` ${userCanEdit ? 'text-teal-600 hover:text-teal-900' : 'text-gray-300 cursor-not-allowed'}`}
                                                        aria-label={`Editar ${med.name}`}
                                                        disabled={!userCanEdit}
                                                        title={userCanEdit ? `Editar ${med.name}` : "Você não tem permissão para editar este item"}
                                                    >
                                                        <EditIcon />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(med)}
                                                        className={`${userCanEdit ? 'text-red-600 hover:text-red-900' : 'text-gray-300 cursor-not-allowed'}`}
                                                        aria-label={`Excluir ${med.name}`}
                                                        disabled={!userCanEdit}
                                                        title={userCanEdit ? `Excluir ${med.name}` : "Você não tem permissão para excluir este item"}
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-gray-500">
                                            { isLoading ? 'Carregando medicamentos...' : 'Nenhum medicamento encontrado.' }
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleOpenAddModal}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>Adicionar Medicamento</span>
                        </button>
                    </div>
                </div>
            </main>
            
            <AddMedicationModal 
                isOpen={isMedicationModalOpen} 
                onClose={handleCloseModal} 
                onSave={saveMedication}
                medicationToEdit={editingMedication} 
            />
            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                medications={medications}
            />
            <DeleteConfirmationModal
                isOpen={!!medicationToDelete}
                onClose={() => setMedicationToDelete(null)}
                onConfirm={handleConfirmDelete}
                medicationName={medicationToDelete?.name || ''}
            />
            <ShareConfirmationModal
                isOpen={!!sharedData}
                onClose={handleCancelImport}
                onConfirm={handleConfirmImport}
            />
        </div>
    );
};

export default App;
