
import React from 'react';
import { CopyIcon, CheckIcon, CloseIcon, BookmarkIcon } from './Icons';

type DisplayItem = { value: string; header?: string };

interface CompactViewProps {
    list: DisplayItem[][];
    copiedItem: string | null;
    onClose: () => void;
    setCopiedItem: (text: string | null) => void;
    highlightedItems: Set<string>;
    toggleHighlight: (key: string) => void;
    clickedItems: Set<string>;
    setClickedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const CompactView: React.FC<CompactViewProps> = ({ list, copiedItem, onClose, setCopiedItem, highlightedItems, toggleHighlight, clickedItems, setClickedItems }) => {
    const handleCompactCopy = (text: string, key: string, event: React.MouseEvent) => {
        const ownerWindow = event.currentTarget.ownerDocument.defaultView;
        if (!ownerWindow) {
            console.error('Could not get window context for copying');
            return;
        }

        ownerWindow.navigator.clipboard.writeText(text).then(() => {
            setCopiedItem(text);
            setClickedItems(prev => new Set(prev).add(key));
            setTimeout(() => setCopiedItem(null), 2000);
        }).catch(err => {
            console.error('Failed to copy from compact view:', err);
        });
    };

    return (
        <div className="p-3 font-sans h-full flex flex-col bg-gray-50 text-slate-800 rounded-lg">
            <div className="flex justify-between items-center mb-3 px-1 flex-shrink-0">
                <h3 className="text-md font-semibold text-purple-600">Vista Compacta</h3>
                <button 
                    onClick={onClose} 
                    className="p-1.5 rounded-full hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400" 
                    title="Cerrar vista compacta"
                    aria-label="Cerrar vista compacta"
                >
                    <CloseIcon className="w-5 h-5 text-slate-600" />
                </button>
            </div>
            <div className="flex-grow overflow-y-auto pr-1">
                {list.length > 0 ? (
                    <ul className="space-y-1.5">
                        {list.flatMap((row, rowIndex) => {
                            const rowItems = row.map((itemObj, itemIndex) => {
                                const uniqueKey = `${rowIndex}-${itemIndex}`;
                                const { value: item, header } = itemObj;
                                const isHighlighted = highlightedItems.has(uniqueKey);
                                const isClicked = clickedItems.has(uniqueKey);

                                return (
                                    <li 
                                        key={uniqueKey}
                                        title={header || 'Elemento copiable'}
                                        className={`p-2 flex justify-between items-center shadow-sm transition-all duration-150 group rounded-md focus-within:ring-1 focus-within:ring-purple-400 border ${isHighlighted ? 'bg-yellow-100 border-yellow-400' : isClicked ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-slate-200'}`}
                                    >
                                        <span 
                                            className="text-slate-800 break-all pr-2 text-sm flex-grow cursor-pointer"
                                            onClick={(e) => handleCompactCopy(item, uniqueKey, e)}
                                        >
                                            {item}
                                        </span>
                                        <div className="flex-shrink-0 flex items-center space-x-0.5">
                                            {copiedItem === item ? (
                                                <CheckIcon className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <button
                                                    onClick={(e) => handleCompactCopy(item, uniqueKey, e)}
                                                    className="p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 focus:opacity-100"
                                                    title="Copiar"
                                                >
                                                    <CopyIcon className="w-3 h-3" />
                                                </button>
                                            )}
                                             <button
                                                onClick={() => toggleHighlight(uniqueKey)}
                                                className={`p-1 rounded-full text-slate-400 transition-opacity hover:bg-slate-200 focus:opacity-100 ${isHighlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                title={isHighlighted ? "Quitar resaltado" : "Resaltar item"}
                                            >
                                                <BookmarkIcon className={`w-3 h-3 ${isHighlighted ? 'text-yellow-600' : ''}`} isFilled={isHighlighted} />
                                            </button>
                                        </div>
                                    </li>
                                );
                            });
                            
                            if (rowIndex < list.length - 1) {
                                rowItems.push(
                                    <li key={`sep-${rowIndex}`} className="py-1" aria-hidden="true">
                                        <div className="flex items-center" aria-hidden="true">
                                            <div className="flex-grow border-t-2 border-violet-300"></div>
                                            <span className="mx-2 text-violet-500 text-sm">❖</span>
                                            <div className="flex-grow border-t-2 border-violet-300"></div>
                                        </div>
                                    </li>
                                );
                            }
                            
                            return rowItems;
                        })}
                    </ul>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        La lista aparecerá aquí...
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompactView;
