

import React, { useState, useEffect } from 'react';
import { generateInventoryReport } from '../services/geminiService';
import { Medication } from '../types';
import { CloseIcon, SpinnerIcon, PrintIcon } from './Icons';
import { marked } from 'marked';

type ReportModalProps = {
    isOpen: boolean;
    onClose: () => void;
    medications: Medication[];
};

type ViewState = 'selection' | 'loading' | 'report' | 'error';

const availableColumns: { id: string, label: string }[] = [
    { id: 'name', label: 'Nome' },
    { id: 'activeIngredient', label: 'Princípio Ativo' },
    { id: 'manufacturer', label: 'Laboratório' },
    { id: 'presentation', label: 'Apresentação' },
    { id: 'class', label: 'Classe' },
    { id: 'mechanismOfAction', label: 'Mecanismo de Ação' },
    { id: 'quantity', label: 'Quantidade' },
    { id: 'expirationDate', label: 'Validade' },
    { id: 'pmc', label: 'PMC (R$)' },
    { id: 'status', label: 'Status' },
    { id: 'barcode', label: 'Cód. Barras' },
    { id: 'officeNumber', label: 'Nº Consultório' },
];

const defaultColumns = ['name', 'quantity', 'expirationDate', 'status'];

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, medications }) => {
    const [view, setView] = useState<ViewState>('selection');
    const [reportContent, setReportContent] = useState('');
    const [selectedColumns, setSelectedColumns] = useState<string[]>(defaultColumns);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setView('selection');
            setReportContent('');
            setError('');
            setSelectedColumns(defaultColumns);
        }
    }, [isOpen]);

    const handleColumnChange = (columnId: string) => {
        setSelectedColumns(prev =>
            prev.includes(columnId)
                ? prev.filter(c => c !== columnId)
                : [...prev, columnId]
        );
    };

    const handleGenerateReport = async () => {
        if (selectedColumns.length === 0) {
            setError('Por favor, selecione pelo menos uma coluna.');
            return;
        }
        
        setError('');
        setView('loading');
        
        try {
            const content = await generateInventoryReport(medications, selectedColumns);
            const htmlContent = await marked.parse(content);
            setReportContent(htmlContent);
            setView('report');
        } catch (err: any) {
            setError(err.message || 'Falha ao gerar o relatório.');
            setView('error');
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Relatório de Inventário</title>
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                margin: 1.5rem;
                                line-height: 1.6;
                                color: #333;
                            }
                            .print-header {
                                margin-bottom: 1.5rem;
                                border-bottom: 1px solid #e5e7eb;
                                padding-bottom: 1rem;
                            }
                            .print-header h1 {
                                font-size: 1.5rem;
                                font-weight: 600;
                                margin: 0;
                            }
                            .print-header p {
                                font-size: 0.875rem;
                                color: #6b7280;
                                margin: 0.25rem 0 0;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                font-size: 10pt;
                            }
                            th, td {
                                padding: 8px 10px;
                                border: 1px solid #ddd;
                                text-align: left;
                                vertical-align: top;
                            }
                            th {
                                background-color: #f9fafb;
                                font-weight: 600;
                            }
                            tr:nth-child(even) {
                                background-color: #f9fafb;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-header">
                            <h1>Relatório de Estoque de Medicamentos</h1>
                            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        ${reportContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            alert('A abertura de novas janelas foi bloqueada pelo seu navegador. Por favor, habilite pop-ups para este site para poder imprimir.');
        }
    };


    if (!isOpen) return null;
    
    const renderContent = () => {
        switch(view) {
            case 'selection':
                return (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Personalizar Relatório</h3>
                        <p className="text-sm text-gray-600 mb-4">Selecione as colunas que você deseja incluir no seu relatório de inventário.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                            {availableColumns.map(col => (
                                <label key={col.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(col.id)}
                                        onChange={() => handleColumnChange(col.id)}
                                        className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{col.label}</span>
                                </label>
                            ))}
                        </div>
                        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
                    </div>
                );
            case 'loading':
                 return (
                    <div className="flex flex-col items-center justify-center h-64">
                        <SpinnerIcon className="h-10 w-10 text-teal-600" />
                        <p className="mt-4 text-gray-600">Gerando relatório personalizado...</p>
                    </div>
                );
            case 'error':
                 return <div className="text-red-500 bg-red-100 p-3 rounded-md">{error}</div>;

            case 'report':
                 return (
                    <div
                        className="prose prose-sm max-w-none prose-table:w-full prose-table:table-fixed prose-th:text-left prose-th:bg-gray-50 prose-th:p-2 prose-td:p-2 prose-tr:border-b"
                        dangerouslySetInnerHTML={{ __html: reportContent }}
                    />
                );
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Relatório de Inventário</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <CloseIcon />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {renderContent()}
                </div>
                <div className="p-4 border-t flex justify-between items-center gap-3">
                    <div>
                      { (view === 'report' || view === 'error') && (
                        <button
                            type="button"
                            onClick={() => setView('selection')}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        >
                            Voltar
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3">
                       {view === 'report' && (
                         <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                            >
                                <PrintIcon className="w-5 h-5" />
                                <span>Imprimir</span>
                            </button>
                       )}
                       {view !== 'selection' && (
                         <button
                            type="button"
                            onClick={onClose}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        >
                            Fechar
                        </button>
                       )}
                       {view === 'selection' && (
                             <button
                                type="button"
                                onClick={handleGenerateReport}
                                className="bg-teal-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                            >
                                Gerar Relatório
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};