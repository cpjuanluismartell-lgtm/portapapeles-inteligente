
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Transformation, TransformationsState } from './types';
import { CopyIcon, CheckIcon, KeyboardIcon, ResetIcon, PasteIcon, PipIcon, SearchIcon, BookmarkIcon, ArrowUpIcon, ArrowDownIcon, ChevronLeftIcon, ChevronRightIcon } from './components/Icons';
import CompactView from './components/CompactView';

type DisplayItem = { value: string; header?: string };

const App: React.FC = () => {
    const initialState: TransformationsState = {
        [Transformation.Spaces]: false,
        [Transformation.Commas]: false,
        [Transformation.Lowercase]: false,
        [Transformation.Uppercase]: false,
        [Transformation.TitleCase]: false,
        [Transformation.Accents]: false,
        [Transformation.RemoveDecimals]: false,
    };

    const [inputText, setInputText] = useState<string>('');
    const [processedList, setProcessedList] = useState<string[][]>([]);
    const [transformations, setTransformations] = useState<TransformationsState>(initialState);
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [copiedItem, setCopiedItem] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());
    const [clickedItems, setClickedItems] = useState<Set<string>>(new Set());
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

    const [compactWindow, setCompactWindow] = useState<Window | null>(null);
    const compactRootRef = useRef<ReturnType<typeof ReactDOM.createRoot> | null>(null);

    const [headers, setHeaders] = useState<string[]>([]);
    const [compactResults, setCompactResults] = useState<boolean>(false);
    const [compactResults2, setCompactResults2] = useState<boolean>(false);

    // Scroll Logic Refs and State
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const checkScroll = useCallback(() => {
        const el = resultsContainerRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;
        setCanScrollUp(scrollTop > 0);
        setCanScrollDown(Math.ceil(scrollTop + clientHeight) < scrollHeight);
    }, []);

    const scrollToTop = () => {
        resultsContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToBottom = () => {
        resultsContainerRef.current?.scrollTo({ top: resultsContainerRef.current.scrollHeight, behavior: 'smooth' });
    };


    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            setInputText(text);
        } catch (err) {
            console.error('No se pudo leer el portapapeles: ', err);
            alert('No se pudo pegar el texto. Asegúrate de haber otorgado permisos para acceder al portapapeles.');
        }
    }, []);

    const handleProcessText = useCallback(() => {
        setHeaders([]); 
        setHighlightedItems(new Set());
        setClickedItems(new Set());
        setCurrentCardIndex(0);
        const lines = inputText.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            setProcessedList([]);
            return;
        }

        const firstLine = lines[0];
        const upperFirstLine = firstLine.toUpperCase();
        const headerKeywords = ['RFC', 'BENEFICIARIO', 'NOMBRE', 'CONCEPTO', 'IMPORTE', 'CLABE', 'FECHA', 'BANCO', 'CUENTA', 'REFERENCIA'];
        
        const matchingKeywordsCount = headerKeywords.reduce((count, keyword) => {
            return upperFirstLine.includes(keyword) ? count + 1 : count;
        }, 0);

        let linesToProcess = lines;
        if (matchingKeywordsCount >= 3) {
            const parsedHeaders = firstLine.split('\t').map(h => h.trim().toUpperCase());
            setHeaders(parsedHeaders);
            linesToProcess = lines.slice(1);
        } else {
             setCompactResults(false);
             setCompactResults2(false);
        }
        
        const result: string[][] = linesToProcess.map(line => 
            line.split('\t')
                .map(item => item.replace(/'/g, '').replace(/#/g, '').trim())
        ).filter(row => row.some(item => item !== ''));
    
        setProcessedList(result);
    }, [inputText]);

    const handleRestart = useCallback(() => {
        setInputText('');
        setProcessedList([]);
        setTransformations(initialState);
        setShowDatePicker(false);
        setSelectedDate('');
        setCopiedItem(null);
        setHeaders([]);
        setCompactResults(false);
        setCompactResults2(false);
        setSearchTerm('');
        setHighlightedItems(new Set());
        setClickedItems(new Set());
        setCanScrollUp(false);
        setCanScrollDown(false);
        setCurrentCardIndex(0);
    }, [initialState]);

    const handleCopy = useCallback((text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedItem(text);
            setClickedItems(prev => new Set(prev).add(key));
            setTimeout(() => setCopiedItem(null), 2000);
        });
    }, []);
    
    const toggleHighlight = useCallback((key: string) => {
        setHighlightedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    }, []);

    const handleTransformationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = event.target;
        setTransformations(prev => ({ ...prev, [name]: checked }));
    };

    const displayedList: DisplayItem[][] = useMemo(() => {
        if (processedList.length === 0) return [];

        const formatItemAmount = (item: string) => {
            const cleanedForParsing = item.replace(/,/g, '');
            const numericValue = parseFloat(cleanedForParsing);
            if (!isNaN(numericValue)) {
                const fractionDigits = transformations[Transformation.RemoveDecimals] ? 0 : 2;
                return new Intl.NumberFormat('es-MX', {
                    minimumFractionDigits: fractionDigits,
                    maximumFractionDigits: fractionDigits,
                }).format(numericValue);
            }
            return item;
        };
        
        let listToDisplay: DisplayItem[][] = [];

        if (compactResults && headers.length > 0) {
            const headerIndices = {
                beneficiario: headers.findIndex(h => h.includes('BENEFICIARIO') || h.includes('NOMBRE')),
                concepto: headers.findIndex(h => h.includes('CONCEPTO')),
                importe: headers.findIndex(h => h.includes('IMPORTE')),
            };
            
            listToDisplay = processedList.map(row => {
                const newRow: DisplayItem[] = [];
                if (headerIndices.beneficiario !== -1 && row[headerIndices.beneficiario]) {
                    newRow.push({ value: row[headerIndices.beneficiario], header: 'Beneficiario' });
                }
                if (headerIndices.concepto !== -1 && row[headerIndices.concepto]) {
                    newRow.push({ value: row[headerIndices.concepto], header: 'Concepto' });
                }
                if (headerIndices.importe !== -1 && row[headerIndices.importe]) {
                    newRow.push({ value: formatItemAmount(row[headerIndices.importe]), header: 'Importe' });
                }
                return newRow;
            }).filter(row => row.length > 0);
        } else if (compactResults2 && headers.length > 0) {
            const columnsOfInterest = [
                ['CLABE'], ['CUENTA', 'NO. CUENTA'], ['IMPORTE'], ['CONCEPTO'], ['RFC'], ['BENEFICIARIO', 'NOMBRE'], ['BANCO']
            ];
            
            const headerIndices = columnsOfInterest.map(keys => 
                headers.findIndex(h => keys.some(k => h.includes(k)))
            );

            const CLABE_COL_INDEX = 0;
            const CUENTA_COL_INDEX = 1;
            const IMPORTE_COL_INDEX = 2;
            
            const clabeHeaderIndex = headerIndices[CLABE_COL_INDEX];

            listToDisplay = processedList.map(row => {
                const hasClabe = clabeHeaderIndex !== -1 && row[clabeHeaderIndex] && row[clabeHeaderIndex].trim() !== '' && row[clabeHeaderIndex].trim() !== '-';
                
                return headerIndices
                    .map((headerIndex, colGroupIndex): DisplayItem | undefined => {
                        if (colGroupIndex === CUENTA_COL_INDEX && hasClabe) {
                            return undefined;
                        }

                        if (headerIndex === -1) return undefined;
                        let item = row[headerIndex];
                        if (!item || item.trim() === '' || item.trim() === '-') return undefined;
                        
                        const header = columnsOfInterest[colGroupIndex][0];
                        if (colGroupIndex === IMPORTE_COL_INDEX) {
                            item = formatItemAmount(item);
                        }
                        return { value: item, header };
                    })
                    .filter((item): item is DisplayItem => item !== undefined);
            }).filter(row => row.length > 0);
        } else {
             listToDisplay = processedList.map(row => 
                row.map((item, index) => ({ value: item, header: headers[index] }))
                   .filter(itemObj => itemObj.value !== '' && itemObj.value !== '-')
             ).filter(row => row.length > 0);
        }

        const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

        return listToDisplay.map(row => {
            const isCompactMode = compactResults || compactResults2;
            const amountIndex = !isCompactMode 
                ? row.findIndex(itemObj => /^-?(\d{1,3}(,\d{3})*|\d+)(\.\d+)?$/.test(itemObj.value.trim()))
                : -1;

            return row.map((itemObj, colIndex) => {
                let processedValue = itemObj.value;
                const isAmount = amountIndex !== -1 && colIndex === amountIndex;

                if (isAmount) {
                    processedValue = formatItemAmount(itemObj.value);
                }

                if (transformations[Transformation.Spaces]) processedValue = processedValue.replace(/\s+/g, '');
                if (transformations[Transformation.Commas]) processedValue = processedValue.replace(/,/g, '');
                if (transformations[Transformation.Lowercase]) processedValue = processedValue.toLowerCase();
                if (transformations[Transformation.Uppercase]) processedValue = processedValue.toUpperCase();
                if (transformations[Transformation.TitleCase]) processedValue = toTitleCase(processedValue);
                if (transformations[Transformation.Accents]) processedValue = removeAccents(processedValue);
                
                return { ...itemObj, value: processedValue };
            });
        });
    }, [processedList, transformations, headers, compactResults, compactResults2]);

    const filteredList = useMemo(() => {
        if (!searchTerm.trim()) return displayedList;
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        return displayedList.filter(row => 
            row.some(itemObj => itemObj.value.toLowerCase().includes(lowerSearchTerm))
        );
    }, [displayedList, searchTerm]);

    useEffect(() => {
        // Only reset to the first card when the source data changes or a new search is started.
        setCurrentCardIndex(0);
    }, [searchTerm, processedList]);

    useEffect(() => {
        // If the list length changes due to transformations/filtering and the
        // current index is now out of bounds, adjust it to the last valid index.
        // This keeps the user's position instead of resetting to the start.
        if (currentCardIndex >= filteredList.length) {
            setCurrentCardIndex(Math.max(0, filteredList.length - 1));
        }

        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [filteredList, currentCardIndex, checkScroll]);

    const toggleCompactWindow = useCallback(() => {
        if (compactWindow && !compactWindow.closed) {
            compactWindow.close();
            return;
        }

        const newCompactWindow = window.open('', 'CompactView', 'width=360,height=500,scrollbars=yes,resizable=yes');

        if (!newCompactWindow) {
            alert('No se pudo abrir la ventana compacta. Revisa si tu navegador está bloqueando las ventanas emergentes.');
            return;
        }

        newCompactWindow.document.title = 'Vista Compacta';

        document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => {
            newCompactWindow.document.head.appendChild(style.cloneNode(true));
        });
        const tailwindScript = document.querySelector('script[src="https://cdn.tailwindcss.com"]');
        if (tailwindScript) {
            const newScript = newCompactWindow.document.createElement('script');
            newScript.src = (tailwindScript as HTMLScriptElement).src;
            newCompactWindow.document.head.appendChild(newScript);
        }

        const rootEl = newCompactWindow.document.createElement('div');
        rootEl.id = 'compact-root';
        newCompactWindow.document.body.appendChild(rootEl);
        newCompactWindow.document.body.className = 'bg-gray-50';

        compactRootRef.current = ReactDOM.createRoot(rootEl);
        setCompactWindow(newCompactWindow);

        newCompactWindow.addEventListener('beforeunload', () => {
            setCompactWindow(null);
            compactRootRef.current = null;
        });
    }, [compactWindow]);

    useEffect(() => {
        if (compactWindow && !compactWindow.closed && compactRootRef.current) {
            compactRootRef.current.render(
                <React.StrictMode>
                    <CompactView
                        list={filteredList}
                        setCopiedItem={setCopiedItem}
                        copiedItem={copiedItem}
                        onClose={() => compactWindow.close()}
                        highlightedItems={highlightedItems}
                        toggleHighlight={toggleHighlight}
                        clickedItems={clickedItems}
                        setClickedItems={setClickedItems}
                    />
                </React.StrictMode>
            );
        } else if (compactWindow && compactWindow.closed) {
            setCompactWindow(null);
            compactRootRef.current = null;
        }
    }, [compactWindow, filteredList, copiedItem, highlightedItems, toggleHighlight, clickedItems]);

    const getHighlightedText = (text: string, highlight: string) => {
        if (!highlight.trim()) {
            return text;
        }
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} className="bg-yellow-200 px-0 rounded">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    const handlePrevCard = () => {
        setCurrentCardIndex(prev => (prev > 0 ? prev - 1 : prev));
    };

    const handleNextCard = () => {
        setCurrentCardIndex(prev => (prev < filteredList.length - 1 ? prev + 1 : prev));
    };

    const transformationOptions = [
        { id: Transformation.Spaces, label: 'Quitar Espacios' },
        { id: Transformation.Commas, label: 'Quitar Comas' },
        { id: Transformation.Lowercase, label: 'Minúsculas' },
        { id: Transformation.Uppercase, label: 'Mayúsculas' },
        { id: Transformation.TitleCase, label: 'Formato Título' },
        { id: Transformation.Accents, label: 'Quitar Acentos' },
        { id: Transformation.RemoveDecimals, label: 'Quitar Decimales' },
    ];

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 text-center relative">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">
                        Portapapeles Inteligente
                    </h1>
                    <p className="mt-2 text-lg text-slate-600">Pega, procesa y transforma tu texto al instante.</p>
                     <div className="absolute top-0 right-0 hidden sm:block">
                        <button
                            onClick={toggleCompactWindow}
                            title={compactWindow ? "Cerrar Vista Compacta" : "Activar Vista Compacta Flotante"}
                            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
                        >
                            <PipIcon className="w-5 h-5" />
                            <span>{compactWindow ? 'Cerrar Compacta' : 'Vista Compacta'}</span>
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6">
                        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                            <h3 className="text-lg font-semibold text-purple-600 mb-4">Transformaciones</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {transformationOptions.map(opt => (
                                    <label key={opt.id} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name={opt.id}
                                            checked={transformations[opt.id]}
                                            onChange={handleTransformationChange}
                                            className="h-4 w-4 rounded border-slate-300 bg-gray-100 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-slate-700">{opt.label}</span>
                                    </label>
                                ))}
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showDatePicker}
                                        onChange={(e) => setShowDatePicker(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 bg-gray-100 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-slate-700">Fecha</span>
                                </label>
                                <label title={headers.length === 0 ? "Primero procesa un texto con encabezados" : "Muestra solo Beneficiario, Concepto e Importe"} className={`flex items-center space-x-2 ${headers.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        name="compactResults"
                                        checked={compactResults}
                                        onChange={(e) => {
                                            setCompactResults(e.target.checked);
                                            if (e.target.checked) setCompactResults2(false);
                                        }}
                                        disabled={headers.length === 0}
                                        className="h-4 w-4 rounded border-slate-300 bg-gray-100 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-slate-700">Compactar</span>
                                </label>
                                <label title={headers.length === 0 ? "Primero procesa un texto con encabezados" : "Muestra campos de pago (Clabe, Cuenta, Importe...)"} className={`flex items-center space-x-2 ${headers.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        name="compactResults2"
                                        checked={compactResults2}
                                        onChange={(e) => {
                                            setCompactResults2(e.target.checked);
                                            if (e.target.checked) setCompactResults(false);
                                        }}
                                        disabled={headers.length === 0}
                                        className="h-4 w-4 rounded border-slate-300 bg-gray-100 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-slate-700">Compactar 2</span>
                                </label>
                            </div>
                            {showDatePicker && (
                                <div className="mt-6 p-4 bg-slate-50 rounded-md border border-slate-200">
                                    <label htmlFor="date-picker" className="block text-sm font-medium text-slate-500 mb-2">Selecciona una fecha</label>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <input
                                            type="date"
                                            id="date-picker"
                                            value={selectedDate || today}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="bg-white border-slate-300 rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {selectedDate && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleCopy(selectedDate, 'datepicker')} className="p-2 rounded-full bg-slate-200 hover:bg-purple-200 transition-colors" title="Copiar Fecha">
                                                    <CopyIcon/>
                                                </button>
                                                 <div className="group relative flex">
                                                    <button onClick={() => handleCopy(selectedDate, 'datepicker-keyboard')} className="p-2 rounded-full bg-slate-200 hover:bg-purple-200 transition-colors" title="Copiar y pegar en otra app">
                                                        <KeyboardIcon />
                                                    </button>
                                                    <span className="absolute left-1/2 -translate-x-1/2 top-10 w-max scale-0 transition-all rounded bg-gray-800 p-2 text-xs text-white group-hover:scale-100">
                                                        ¡Copiado! Pega en tu app activa.
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                           <div className="flex justify-between items-center mb-2">
                                <label htmlFor="inputText" className="block text-lg font-semibold text-purple-600">
                                    Pega tu texto aquí
                                </label>
                           </div>
                           <div className="mb-4 flex flex-wrap gap-4">
                                <div className="flex-1 flex gap-4">
                                    <button
                                        onClick={handleProcessText}
                                        className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-blue-500 transition-colors duration-200"
                                    >
                                        Procesar
                                    </button>
                                    <button
                                        onClick={handlePaste}
                                        title="Pegar desde el portapapeles"
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 font-bold py-2 px-4 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 transition-colors duration-200"
                                    >
                                        <PasteIcon className="w-5 h-5" />
                                        Pegar
                                    </button>
                                </div>
                                <button
                                    onClick={handleRestart}
                                    title="Reiniciar aplicación"
                                    className="flex items-center justify-center gap-2 bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-slate-400 transition-colors duration-200"
                                >
                                    <ResetIcon/>
                                    Reiniciar
                                </button>
                            </div>
                            <textarea
                                id="inputText"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Pega el contenido separado por saltos de línea y/o tabulaciones..."
                                className="w-full h-48 p-3 bg-violet-50 border border-violet-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-slate-800"
                            />
                        </div>
                    </div>
                    
                    <div className={`bg-white rounded-lg shadow-md p-6 border border-slate-200 flex flex-col transition-opacity duration-300 ${compactWindow ? 'opacity-40 pointer-events-none' : ''}`}>
                         <h3 className="text-lg font-semibold text-purple-600 mb-2">
                            Resultados {compactWindow && <span className="text-sm font-normal text-slate-500">(en vista compacta)</span>}
                        </h3>
                        <div className="flex items-center gap-2 mb-4">
                             <button
                                onClick={handlePrevCard}
                                disabled={currentCardIndex === 0 || filteredList.length === 0}
                                className="p-2 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Beneficiario anterior"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <div className="relative flex-grow">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <SearchIcon className="w-5 h-5 text-slate-400" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar en resultados..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    disabled={displayedList.length === 0}
                                />
                            </div>
                             <button
                                onClick={handleNextCard}
                                disabled={currentCardIndex === filteredList.length - 1 || filteredList.length === 0}
                                className="p-2 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Siguiente beneficiario"
                            >
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative flex-grow h-96 bg-violet-50 border border-violet-200 rounded-md">
                            <div 
                                ref={resultsContainerRef} 
                                onScroll={checkScroll} 
                                className="h-full w-full overflow-y-auto p-2"
                            >
                                {filteredList.length > 0 ? (
                                    <ul className="space-y-2">
                                        {filteredList[currentCardIndex].map((itemObj, itemIndex) => {
                                            const uniqueKey = `${currentCardIndex}-${itemIndex}`;
                                            const { value: item, header } = itemObj;
                                            const isHighlighted = highlightedItems.has(uniqueKey);
                                            const isClicked = clickedItems.has(uniqueKey);
                                            const itemMatchesSearch = searchTerm.trim() !== '' && item.toLowerCase().includes(searchTerm.toLowerCase().trim());
                                            
                                            return (
                                                <li 
                                                    key={uniqueKey}
                                                    title={header || 'Elemento copiable'}
                                                    className={`p-3 flex justify-between items-center shadow-sm transition-all duration-150 group rounded-lg focus-within:ring-2 focus-within:ring-purple-400 border ${isHighlighted ? 'bg-yellow-100 border-yellow-400' : isClicked ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-slate-200'} ${itemMatchesSearch ? 'ring-2 ring-purple-300' : ''}`}
                                                >
                                                    <span 
                                                        className="text-slate-800 break-all pr-4 flex-grow cursor-pointer"
                                                        onClick={() => handleCopy(item, uniqueKey)}
                                                    >
                                                        {getHighlightedText(item, searchTerm.trim())}
                                                    </span>
                                                    <div className="flex-shrink-0 flex items-center space-x-1">
                                                        {copiedItem === item ? (
                                                        <CheckIcon className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                        <button
                                                            onClick={() => handleCopy(item, uniqueKey)}
                                                            className="p-1.5 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 focus:opacity-100"
                                                            title="Copiar"
                                                        >
                                                            <CopyIcon className="w-4 h-4" />
                                                        </button>
                                                        )}
                                                        <button
                                                            onClick={() => toggleHighlight(uniqueKey)}
                                                            className={`p-1.5 rounded-full text-slate-400 transition-opacity hover:bg-slate-200 focus:opacity-100 ${isHighlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                            title={isHighlighted ? "Quitar resaltado" : "Resaltar item"}
                                                        >
                                                            <BookmarkIcon className={`w-4 h-4 ${isHighlighted ? 'text-yellow-600' : ''}`} isFilled={isHighlighted} />
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500">
                                        {displayedList.length > 0 && searchTerm ? 'No hay coincidencias.' : 'La lista procesada aparecerá aquí...'}
                                    </div>
                                )}
                            </div>
                            
                            {canScrollUp && (
                                <button 
                                    onClick={scrollToTop}
                                    className="absolute top-2 right-4 bg-white/90 hover:bg-white text-purple-600 p-2 rounded-full shadow-lg border border-purple-100 backdrop-blur-sm transition-all z-10 hover:scale-110 active:scale-95"
                                    title="Ir arriba"
                                    aria-label="Ir arriba"
                                >
                                    <ArrowUpIcon className="w-6 h-6" />
                                </button>
                            )}
                            
                            {canScrollDown && (
                                <button 
                                    onClick={scrollToBottom}
                                    className="absolute bottom-10 right-4 bg-white/90 hover:bg-white text-purple-600 p-2 rounded-full shadow-lg border border-purple-100 backdrop-blur-sm transition-all z-10 hover:scale-110 active:scale-95"
                                    title="Ir abajo"
                                    aria-label="Ir abajo"
                                >
                                    <ArrowDownIcon className="w-6 h-6" />
                                </button>
                            )}
                            {filteredList.length > 0 && (
                                 <div className="absolute bottom-2 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
                                     {currentCardIndex + 1} de {filteredList.length}
                                 </div>
                            )}
                        </div>
                    </div>
                </div>
                 <div className="mt-6 sm:hidden flex justify-center">
                        <button
                            onClick={toggleCompactWindow}
                            title={compactWindow ? "Cerrar Vista Compacta" : "Activar Vista Compacta Flotante"}
                            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
                        >
                            <PipIcon className="w-5 h-5" />
                            <span>{compactWindow ? 'Cerrar Compacta' : 'Vista Compacta'}</span>
                        </button>
                </div>
            </div>
        </div>
    );
};

export default App;
