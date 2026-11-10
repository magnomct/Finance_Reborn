import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, X, 
  ArrowRight, ShieldCheck, RefreshCw, FileSpreadsheet,
  Check, Trash2, HelpCircle, Layers, CreditCard, Plus
} from 'lucide-react';
import { Transaction, AccountType, CostCenter, JarType, AutoCategoryRule } from '../types';
import { parseOFX, parseCSV, ParsedImportItem } from '../utils/bankFileParsers';
import { formatBRL } from '../utils/finance';
import { JAR_DEFINITIONS } from '../data/initialData';
import { loadCustomAccounts, saveCustomAccount, getAllAvailableAccounts } from '../utils/customAccounts';

interface BankImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTransactions: (newTransactions: Transaction[]) => void;
  existingTransactions: Transaction[];
  autoRules: AutoCategoryRule[];
}

// Sample mock contents for immediate 1-click testing
const SAMPLE_OFX_CONTENT = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20261028120000
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>077
<ACCTID>1234567-8
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261001
<DTEND>20261028
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261025120000
<TRNAMT>-189.40
<FITID>OFX20261025001
<MEMO>SUPERMERCADO CARREFOUR BAIRRO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261026120000
<TRNAMT>-54.90
<FITID>OFX20261026002
<MEMO>POSTO IPIRANGA COMBUSTIVEL
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261026180000
<TRNAMT>-32.50
<FITID>OFX20261026003
<MEMO>FARMACIA DROGASIL
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261027100000
<TRNAMT>1800.00
<FITID>OFX20261027004
<MEMO>PIX RECEBIDO - CONSULTORIA TI OUT
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261028140000
<TRNAMT>-42.00
<FITID>OFX20261028005
<MEMO>IFOOD RESTAURANTE DELIVERY
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const SAMPLE_CSV_CONTENT = `Data;Descricao;Valor;Tipo;Categoria
25/10/2026;Supermercado Pao de Acucar;-245,60;Debito;Alimentação & Feira
26/10/2026;Uber Viagem Centro;-28,90;Debito;Transporte
27/10/2026;Curso Alura Assinatura Anual;-120,00;Debito;Educação & Cursos
28/10/2026;Transferencia Recebida Nathan;858,00;Credito;Reembolso
28/10/2026;Enel Energia Eletrica SP;-75,00;Debito;Habitação`;

export const BankImportModal: React.FC<BankImportModalProps> = ({
  isOpen,
  onClose,
  onImportTransactions,
  existingTransactions,
  autoRules
}) => {
  const [selectedAccount, setSelectedAccount] = useState<AccountType>('Inter PF');
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter>('Magno');
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'ofx' | 'csv' | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process raw text content based on file extension
  const processFileContent = (content: string, name: string) => {
    setIsProcessing(true);
    setFileName(name);

    const isOfx = name.toLowerCase().endsWith('.ofx') || content.includes('<OFX>');
    setFileType(isOfx ? 'ofx' : 'csv');

    let items: ParsedImportItem[] = [];
    if (isOfx) {
      items = parseOFX(content, {
        account: selectedAccount,
        costCenter: selectedCostCenter,
        existingTransactions,
        rules: autoRules
      });
    } else {
      items = parseCSV(content, {
        account: selectedAccount,
        costCenter: selectedCostCenter,
        existingTransactions,
        rules: autoRules
      });
    }

    // Default selection
    setParsedItems(items);
    setStep('preview');
    setIsProcessing(false);
  };

  // Handle file drop or selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  // Load sample template for quick testing
  const loadSample = (type: 'ofx' | 'csv') => {
    if (type === 'ofx') {
      processFileContent(SAMPLE_OFX_CONTENT, 'extrato_nubank_outubro.ofx');
    } else {
      processFileContent(SAMPLE_CSV_CONTENT, 'extrato_banco_inter.csv');
    }
  };

  // Toggle item selection
  const toggleItemSelect = (id: string) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    }));
  };

  // Toggle all
  const toggleSelectAll = (select: boolean) => {
    setParsedItems(prev => prev.map(item => ({
      ...item,
      selected: select && (ignoreDuplicates ? !item.isDuplicate : true)
    })));
  };

  // Update item field in preview
  const updateItemField = (id: string, field: keyof ParsedImportItem, value: any) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Confirm import
  const handleConfirmImport = () => {
    const selected = parsedItems.filter(i => i.selected);
    if (selected.length === 0) return;

    const newTransactions: Transaction[] = selected.map(item => ({
      id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: item.date,
      description: item.description,
      amount: item.amount,
      type: item.type,
      jar: item.jar,
      category: item.category,
      account: item.account,
      costCenter: item.costCenter,
      status: 'liquidado'
    }));

    onImportTransactions(newTransactions);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setParsedItems([]);
    setFileName('');
    setFileType(null);
    onClose();
  };

  const selectedCount = parsedItems.filter(i => i.selected).length;
  const duplicateCount = parsedItems.filter(i => i.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                Importar Extrato Bancário (.OFX / .CSV)
              </h3>
              <p className="text-xs text-slate-400">
                Adicione lançamentos reais de bancos e cartões com auto-categorização inteligente.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {step === 'upload' && (
            <div className="space-y-4">
              
              {/* Default Account & Cost Center Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Conta Destino
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value as AccountType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none"
                  >
                    {getAllAvailableAccounts().map(acc => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Centro de Custo Padrão
                  </label>
                  <select
                    value={selectedCostCenter}
                    onChange={(e) => setSelectedCostCenter(e.target.value as CostCenter)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none"
                  >
                    <option value="Magno">Magno (CLT / Pessoal)</option>
                    <option value="Nathan">Nathan (Reembolsos)</option>
                    <option value="PJ">PJ (Operação Empresa)</option>
                    <option value="Suzy">Suzy (Familiar)</option>
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-300 dark:border-teal-800 hover:border-teal-500 rounded-3xl p-8 text-center cursor-pointer transition bg-teal-50/20 dark:bg-teal-950/10 hover:bg-teal-50/40 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".ofx,.csv,text/csv,text/plain"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>

                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                  Clique ou arraste seu extrato bancário aqui
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                  Suporta arquivos <strong>.OFX</strong> (Nubank, Itaú, Bradesco, Inter, Santander, BB) e planilhas <strong>.CSV</strong>.
                </p>

                <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-teal-700 dark:text-teal-400">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100/80 dark:bg-teal-900/60">
                    .OFX Universal
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    .CSV Tabulado
                  </span>
                </div>
              </div>

              {/* Quick Sample Testers */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Não tem um arquivo no momento? Teste com um clique:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadSample('ofx')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-700 transition shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Carregar Exemplo .OFX (Nubank/Inter)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadSample('csv')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Carregar Exemplo .CSV (Extrato Bancário)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-teal-50 dark:bg-teal-950/30 rounded-2xl border border-teal-100 dark:border-teal-900 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-teal-900 dark:text-teal-200">
                    Arquivo: {fileName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                    {fileType}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-600 dark:text-slate-300">
                    Total: <strong>{parsedItems.length}</strong>
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    Selecionados: {selectedCount}
                  </span>
                  {duplicateCount > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      Duplicatas: {duplicateCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                  >
                    Selecionar Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="text-slate-500 hover:underline"
                  >
                    Desmarcar Todos
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Escolher outro arquivo</span>
                </button>
              </div>

              {/* Transactions Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount === parsedItems.length && parsedItems.length > 0}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                      </th>
                      <th className="py-2 px-2.5">Data</th>
                      <th className="py-2 px-3">Descrição</th>
                      <th className="py-2 px-3 text-right">Valor</th>
                      <th className="py-2 px-3">Pote Sugerido</th>
                      <th className="py-2 px-3">Categoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedItems.map((item) => {
                      const isIncome = item.amount >= 0;
                      return (
                        <tr 
                          key={item.id}
                          className={`transition ${item.selected ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/40 opacity-60'} ${item.isDuplicate ? 'bg-amber-50/30' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleItemSelect(item.id)}
                              className="rounded text-blue-600"
                            />
                          </td>

                          <td className="py-2.5 px-2.5 font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {item.date}
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 px-1 py-0.5 rounded text-xs text-slate-900 dark:text-white focus:outline-none"
                            />
                            {item.isDuplicate && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block">
                                ⚠️ Possível duplicata já registrada
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-black whitespace-nowrap">
                            <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {isIncome ? `+${formatBRL(item.amount)}` : formatBRL(item.amount)}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <select
                              value={item.jar}
                              onChange={(e) => updateItemField(item.id, 'jar', e.target.value as JarType)}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                              {Object.entries(JAR_DEFINITIONS).map(([key, def]) => (
                                <option key={key} value={key}>
                                  {def.shortName}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) => updateItemField(item.id, 'category', e.target.value)}
                              className="w-32 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 px-1 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/60 rounded-b-3xl">
          <div className="text-xs text-slate-500">
            {step === 'preview' && (
              <span>
                <strong>{selectedCount}</strong> lançamentos serão inseridos no extrato
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cancelar
            </button>

            {step === 'preview' && (
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black shadow-sm transition"
              >
                <Check className="w-4 h-4" />
                <span>Importar {selectedCount} Lançamentos</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
